package main

import (
	"context"
	"fmt"
	"log"
	"strconv"
	"strings"
	"time"

	"github.com/gosnmp/gosnmp"
)

func startSnmpWorker(state *appState) {
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	for range ticker.C {
		ctx := context.Background()

		// Ambil semua device yang monitoring SNMP-nya aktif
		rows, err := state.db.Query(ctx, `
			SELECT id, name, ip, snmp_version, snmp_community 
			FROM devices 
			WHERE monitoring_enabled = TRUE AND integration_mode ILIKE '%snmp%'
		`)
		if err != nil {
			log.Printf("snmp worker query devices error: %v", err)
			continue
		}

		type snmpDevice struct {
			ID        int
			Name      string
			IP        string
			Version   string
			Community string
		}

		var devices []snmpDevice
		for rows.Next() {
			var d snmpDevice
			if err := rows.Scan(&d.ID, &d.Name, &d.IP, &d.Version, &d.Community); err != nil {
				continue
			}
			devices = append(devices, d)
		}
		rows.Close()

		for _, d := range devices {
			go pollDeviceSnmp(state, d)
		}
	}
}

func pollDeviceSnmp(state *appState, d struct {
	ID        int
	Name      string
	IP        string
	Version   string
	Community string
}) {
	gs := &gosnmp.GoSNMP{
		Target:    d.IP,
		Port:      161,
		Community: d.Community,
		Version:   gosnmp.Version2c, // Default ke v2c untuk kemudahan
		Timeout:   time.Duration(2) * time.Second,
		Retries:   1,
	}

	if d.Version == "v1" {
		gs.Version = gosnmp.Version1
	} else if d.Version == "v3" {
		// v3 butuh konfigurasi lebih lanjut (UsmStats, dll), kita skip dulu untuk kesederhanaan
		log.Printf("SNMP v3 not yet supported for %s", d.Name)
		return
	}

	err := gs.Connect()
	if err != nil {
		log.Printf("SNMP connect error for %s (%s): %v", d.Name, d.IP, err)
		return
	}
	defer gs.Conn.Close()

	// OID untuk interface stats
	// IfDescr: .1.3.6.1.2.1.2.2.1.2
	// IfHCInOctets: .1.3.6.1.2.1.31.1.1.1.6
	// IfHCOutOctets: .1.3.6.1.2.1.31.1.1.1.10

	// 1) Ambil daftar nama interface (ifDescr)
	ifNames := make(map[int]string)
	err = gs.Walk(".1.3.6.1.2.1.2.2.1.2", func(p gosnmp.SnmpPDU) error {
		// Ambil index dari bagian terakhir OID (.1.3.6.1.2.1.2.2.1.2.[INDEX])
		parts := strings.Split(strings.TrimPrefix(p.Name, "."), ".")
		if len(parts) > 0 {
			index, _ := strconv.Atoi(parts[len(parts)-1])
			if index > 0 {
				switch v := p.Value.(type) {
				case []byte:
					ifNames[index] = string(v)
				case string:
					ifNames[index] = v
				default:
					ifNames[index] = fmt.Sprintf("%v", v)
				}
			}
		}
		return nil
	})
	if err != nil {
		log.Printf("SNMP walk names error for %s: %v", d.Name, err)
		return
	}

	// Helper untuk ambil index dari OID octets
	getOidIndex := func(oidName string) int {
		parts := strings.Split(strings.TrimPrefix(oidName, "."), ".")
		if len(parts) > 0 {
			index, _ := strconv.Atoi(parts[len(parts)-1])
			return index
		}
		return 0
	}

	// 2) Ambil In Octets (HC jika bisa, fallback ke 32bit)
	inOctets := make(map[int]uint64)
	err = gs.Walk(".1.3.6.1.2.1.31.1.1.1.6", func(p gosnmp.SnmpPDU) error {
		index := getOidIndex(p.Name)
		if index > 0 {
			inOctets[index] = gosnmp.ToBigInt(p.Value).Uint64()
		}
		return nil
	})
	// Jika HC tidak ada, coba yang 32bit
	if len(inOctets) == 0 {
		gs.Walk(".1.3.6.1.2.1.2.2.1.10", func(p gosnmp.SnmpPDU) error {
			index := getOidIndex(p.Name)
			if index > 0 {
				inOctets[index] = uint64(gosnmp.ToBigInt(p.Value).Uint64())
			}
			return nil
		})
	}

	// 3) Ambil Out Octets
	outOctets := make(map[int]uint64)
	err = gs.Walk(".1.3.6.1.2.1.31.1.1.1.10", func(p gosnmp.SnmpPDU) error {
		index := getOidIndex(p.Name)
		if index > 0 {
			outOctets[index] = gosnmp.ToBigInt(p.Value).Uint64()
		}
		return nil
	})
	if len(outOctets) == 0 {
		gs.Walk(".1.3.6.1.2.1.2.2.1.16", func(p gosnmp.SnmpPDU) error {
			index := getOidIndex(p.Name)
			if index > 0 {
				outOctets[index] = uint64(gosnmp.ToBigInt(p.Value).Uint64())
			}
			return nil
		})
	}

	// Simpan ke database
	now := time.Now()
	for index, name := range ifNames {
		in := inOctets[index]
		out := outOctets[index]

		if in == 0 && out == 0 {
			continue // Lewati yang kosong
		}

		_, err = state.db.Exec(context.Background(), `
			INSERT INTO device_interface_logs (device_id, interface_name, in_octets, out_octets, created_at)
			VALUES ($1, $2, $3, $4, $5)
		`, d.ID, name, in, out, now)

		if err != nil {
			log.Printf("gagal simpan SNMP log untuk %s index %d: %v", d.Name, index, err)
		}
	}
}
