package main

import (
	"fmt"
	"log"
	"net"
	"net/http"
	"strconv"
	"time"

	"github.com/labstack/echo/v4"
)

type IPPool struct {
	ID          int       `json:"id"`
	WorkspaceID int       `json:"workspaceId"`
	Name        string    `json:"name"`
	Subnet      string    `json:"subnet"`
	Gateway     string    `json:"gateway"`
	DeviceID    *int      `json:"deviceId"`
	VLAN        int       `json:"vlan"`
	Description string    `json:"description"`
	TotalIPs    int       `json:"total"`
	UsedIPs     int       `json:"used"`
	Status      string    `json:"status"`
	CreatedAt   time.Time `json:"createdAt"`
}

type IPAddress struct {
	ID         int       `json:"id"`
	PoolID     int       `json:"poolId"`
	IPAddress  string    `json:"ipAddress"`
	Status     string    `json:"status"`
	DeviceName string    `json:"deviceName"`
	DeviceType string    `json:"deviceType"`
	MACAddress string    `json:"macAddress"`
	Description string   `json:"description"`
	CreatedAt  time.Time `json:"createdAt"`
}

func (a *appState) handleListIPPools(c echo.Context) error {
	ctx := c.Request().Context()
	wsIDStr := c.QueryParam("workspaceId")
	wsID, _ := strconv.Atoi(wsIDStr)
	if wsID <= 0 {
		return c.String(http.StatusBadRequest, "invalid workspaceId")
	}

	query := `SELECT id, workspace_id, name, subnet, COALESCE(gateway, ''), device_id, COALESCE(vlan, 0), COALESCE(description, ''), total_ips, used_ips, status, created_at 
	          FROM ip_pools WHERE workspace_id = $1 ORDER BY created_at DESC`
	rows, err := a.db.Query(ctx, query, wsID)
	if err != nil {
		log.Printf("list ip pools error: %v", err)
		return c.String(http.StatusInternalServerError, "failed to query ip pools")
	}
	defer rows.Close()

	pools := []IPPool{}
	for rows.Next() {
		var p IPPool
		if err := rows.Scan(&p.ID, &p.WorkspaceID, &p.Name, &p.Subnet, &p.Gateway, &p.DeviceID, &p.VLAN, &p.Description, &p.TotalIPs, &p.UsedIPs, &p.Status, &p.CreatedAt); err == nil {
			pools = append(pools, p)
		}
	}

	return c.JSON(http.StatusOK, pools)
}

func (a *appState) handleCreateIPPool(c echo.Context) error {
	ctx := c.Request().Context()
	p := new(IPPool)
	if err := c.Bind(p); err != nil {
		return c.String(http.StatusBadRequest, "invalid request body")
	}

	if p.WorkspaceID <= 0 || p.Name == "" || p.Subnet == "" || p.TotalIPs <= 0 {
		return c.String(http.StatusBadRequest, "missing required fields")
	}

	query := "INSERT INTO ip_pools (workspace_id, name, subnet, gateway, device_id, vlan, description, total_ips, used_ips, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id, created_at"
	err := a.db.QueryRow(ctx, query, p.WorkspaceID, p.Name, p.Subnet, p.Gateway, p.DeviceID, p.VLAN, p.Description, p.TotalIPs, 0, "Active").Scan(&p.ID, &p.CreatedAt)
	if err != nil {
		log.Printf("create ip pool error: %v", err)
		return c.String(http.StatusInternalServerError, "failed to create ip pool")
	}

	return c.JSON(http.StatusCreated, p)
}

func (a *appState) handleUpdateIPPool(c echo.Context) error {
	ctx := c.Request().Context()
	idStr := c.Param("id")
	id, _ := strconv.Atoi(idStr)
	if id <= 0 {
		return c.String(http.StatusBadRequest, "invalid id")
	}

	p := new(IPPool)
	if err := c.Bind(p); err != nil {
		return c.String(http.StatusBadRequest, "invalid request body")
	}

	query := `UPDATE ip_pools SET name = $1, subnet = $2, gateway = $3, device_id = $4, vlan = $5, description = $6, total_ips = $7 WHERE id = $8`
	_, err := a.db.Exec(ctx, query, p.Name, p.Subnet, p.Gateway, p.DeviceID, p.VLAN, p.Description, p.TotalIPs, id)
	if err != nil {
		log.Printf("update ip pool error: %v", err)
		return c.String(http.StatusInternalServerError, "failed to update ip pool")
	}

	return c.JSON(http.StatusOK, p)
}

func (a *appState) handleDeleteIPPool(c echo.Context) error {
	ctx := c.Request().Context()
	idStr := c.Param("id")
	id, _ := strconv.Atoi(idStr)
	if id <= 0 {
		return c.String(http.StatusBadRequest, "invalid id")
	}

	_, err := a.db.Exec(ctx, "DELETE FROM ip_pools WHERE id = $1", id)
	if err != nil {
		log.Printf("delete ip pool error: %v", err)
		return c.String(http.StatusInternalServerError, "failed to delete ip pool")
	}

	return c.NoContent(http.StatusOK)
}

func (a *appState) handleListIPAddresses(c echo.Context) error {
	ctx := c.Request().Context()
	poolIDStr := c.QueryParam("poolId")
	poolID, _ := strconv.Atoi(poolIDStr)
	if poolID <= 0 {
		return c.String(http.StatusBadRequest, "invalid poolId")
	}

	rows, err := a.db.Query(ctx, "SELECT id, pool_id, ip_address, status, COALESCE(device_name, ''), COALESCE(device_type, ''), COALESCE(mac_address, ''), COALESCE(description, ''), created_at FROM ip_addresses WHERE pool_id = $1 ORDER BY id ASC", poolID)
	if err != nil {
		return c.String(http.StatusInternalServerError, "failed to query ips")
	}
	defer rows.Close()

	ips := []IPAddress{}
	for rows.Next() {
		var ip IPAddress
		if err := rows.Scan(&ip.ID, &ip.PoolID, &ip.IPAddress, &ip.Status, &ip.DeviceName, &ip.DeviceType, &ip.MACAddress, &ip.Description, &ip.CreatedAt); err == nil {
			ips = append(ips, ip)
		}
	}

	return c.JSON(http.StatusOK, ips)
}

func (a *appState) handleCreateIPAddress(c echo.Context) error {
	ctx := c.Request().Context()
	ip := new(IPAddress)
	if err := c.Bind(ip); err != nil {
		return c.String(http.StatusBadRequest, "invalid request")
	}

	query := `INSERT INTO ip_addresses (pool_id, ip_address, status, device_name, device_type, mac_address, description) 
	          VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, created_at`
	err := a.db.QueryRow(ctx, query, ip.PoolID, ip.IPAddress, ip.Status, ip.DeviceName, ip.DeviceType, ip.MACAddress, ip.Description).Scan(&ip.ID, &ip.CreatedAt)
	if err != nil {
		return c.String(http.StatusInternalServerError, "failed to create ip")
	}

	return c.JSON(http.StatusCreated, ip)
}

func (a *appState) handleUpdateIPAddress(c echo.Context) error {
	ctx := c.Request().Context()
	idStr := c.Param("id")
	id, _ := strconv.Atoi(idStr)
	
	ip := new(IPAddress)
	if err := c.Bind(ip); err != nil {
		return c.String(http.StatusBadRequest, "invalid request")
	}

	query := `UPDATE ip_addresses SET status = $1, device_name = $2, device_type = $3, mac_address = $4, description = $5 WHERE id = $6`
	_, err := a.db.Exec(ctx, query, ip.Status, ip.DeviceName, ip.DeviceType, ip.MACAddress, ip.Description, id)
	if err != nil {
		return c.String(http.StatusInternalServerError, "failed to update ip")
	}

	return c.JSON(http.StatusOK, ip)
}

func (a *appState) handleDeleteIPAddress(c echo.Context) error {
	ctx := c.Request().Context()
	idStr := c.Param("id")
	id, _ := strconv.Atoi(idStr)
	
	_, err := a.db.Exec(ctx, "DELETE FROM ip_addresses WHERE id = $1", id)
	if err != nil {
		return c.String(http.StatusInternalServerError, "failed to delete ip")
	}

	return c.NoContent(http.StatusOK)
}

func (a *appState) handleGenerateIPs(c echo.Context) error {
	ctx := c.Request().Context()
	poolIDStr := c.Param("id")
	poolID, _ := strconv.Atoi(poolIDStr)

	var pool IPPool
	err := a.db.QueryRow(ctx, "SELECT id, subnet, gateway FROM ip_pools WHERE id = $1", poolID).Scan(&pool.ID, &pool.Subnet, &pool.Gateway)
	if err != nil {
		return c.String(http.StatusNotFound, "pool not found")
	}

	// Parse CIDR
	_, ipNet, err := net.ParseCIDR(pool.Subnet)
	if err != nil {
		return c.String(http.StatusBadRequest, "invalid subnet format")
	}

	// Simple generator for /24 or smaller for now
	// For production, we'd need a more robust IP math library
	ips := generateIPList(ipNet)
	
	// Insert only if not exists
	count := 0
	for _, ipAddr := range ips {
		status := "available"
		if ipAddr == pool.Gateway {
			status = "reserved"
		}
		
		_, err := a.db.Exec(ctx, "INSERT INTO ip_addresses (pool_id, ip_address, status) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING", pool.ID, ipAddr, status)
		if err == nil {
			count++
		}
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"message": fmt.Sprintf("Successfully generated %d IP addresses", count),
		"count": count,
	})
}

// Helper to generate list of IPs in a subnet
func generateIPList(ipNet *net.IPNet) []string {
	var ips []string
	for ip := ipNet.IP.Mask(ipNet.Mask); ipNet.Contains(ip); inc(ip) {
		ips = append(ips, ip.String())
	}
	// Remove network and broadcast for /24-like subnets
	if len(ips) > 4 {
		return ips[1 : len(ips)-1]
	}
	return ips
}

func inc(ip net.IP) {
	for j := len(ip) - 1; j >= 0; j-- {
		ip[j]++
		if ip[j] > 0 {
			break
		}
	}
}
