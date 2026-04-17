package main

import (
	"bytes"
	"fmt"
	"os"
	"strings"

	"github.com/jung-kurt/gofpdf/v2"
)

// generateInvoicePDF membuat file PDF invoice profesional secara murni lewat kode
func generateInvoicePDF(wsName, custName, period, amountStr, invoiceNo, invoiceDate, custAddress string) ([]byte, error) {
	pdf := gofpdf.New("P", "mm", "A4", "")
	pdf.AddPage()

	// --- 1. HEADER SECTION ---
	// Cek apakah ada logo kustom
	logoPath := "assets/logo.png"
	if _, err := os.Stat(logoPath); err == nil {
		// Pasang logo asli bapak (di posisi 15, 10 dengan lebar otomatis)
		pdf.Image(logoPath, 15, 10, 30, 0, false, "", 0, "")
	} else {
		// Logo Simbol (Fallback jika logo.png tidak ada)
		pdf.SetDrawColor(220, 38, 38)
		pdf.SetLineWidth(2)
		pdf.Line(20, 15, 30, 25)
		pdf.Line(30, 15, 20, 25)
	}

	pdf.SetTextColor(220, 38, 38)
	pdf.SetFont("Arial", "B", 14)
	pdf.Text(35, 22, strings.ToUpper(wsName))
	
	// Tulisan "INVOICE" di Kanan Atas
	pdf.SetTextColor(30, 41, 59)
	pdf.SetFont("Arial", "B", 36)
	pdf.Text(140, 25, "INVOICE")
	
	// Garis Horizontal Atas
	pdf.SetDrawColor(40, 40, 40)
	pdf.SetLineWidth(0.5)
	pdf.Line(15, 35, 195, 35)

	// --- 2. CUSTOMER & INVOICE INFO SECTION ---
	// Data Pelanggan (Kiri)
	pdf.SetXY(15, 45)
	pdf.SetFont("Arial", "B", 11)
	pdf.SetTextColor(30, 41, 59)
	pdf.Cell(0, 10, "Kepada Yth:")
	pdf.Ln(7)
	pdf.SetFont("Arial", "B", 12)
	pdf.Cell(0, 10, custName)
	pdf.Ln(6)
	pdf.SetFont("Arial", "", 10)
	pdf.SetTextColor(71, 85, 105)
	pdf.Cell(0, 10, invoiceDate)
	pdf.Ln(6)
	// Alamat
	pdf.SetFont("Arial", "", 10)
	pdf.MultiCell(80, 5, custAddress, "", "L", false)

	// Nomor Invoice (Kanan)
	pdf.SetTextColor(71, 85, 105)
	pdf.SetFont("Arial", "", 10)
	pdf.Text(175, 48, "INVOICE#")
	pdf.SetTextColor(30, 41, 59)
	pdf.SetFont("Arial", "B", 14)
	pdf.Text(145, 55, invoiceNo)

	// --- 3. TABLE SECTION ---
	pdf.SetXY(15, 95)
	
	// Header Tabel (Bar Hitam)
	pdf.SetFillColor(40, 40, 40)
	pdf.SetTextColor(255, 255, 255)
	pdf.SetFont("Arial", "B", 10)
	pdf.CellFormat(130, 10, "  DESKRIPSI LAYANAN", "0", 0, "L", true, 0, "")
	pdf.CellFormat(50, 10, "TOTAL  ", "0", 1, "R", true, 0, "")
	
	// Baris Data (Zebra Style)
	pdf.SetTextColor(50, 50, 50)
	pdf.SetFont("Arial", "", 10)
	
	// Baris 1 (Data Asli)
	pdf.SetFillColor(245, 245, 245)
	pdf.CellFormat(130, 12, fmt.Sprintf("  Internet Subscription - %s", period), "0", 0, "L", true, 0, "")
	pdf.CellFormat(50, 12, amountStr+"  ", "0", 1, "R", true, 0, "")
	
	// Baris 2-5 (Baris Kosong Biar Estetik)
	fills := []bool{false, true, false, true}
	for _, fill := range fills {
		if fill {
			pdf.SetFillColor(245, 245, 245)
		} else {
			pdf.SetFillColor(255, 255, 255)
		}
		pdf.CellFormat(130, 12, "  -", "0", 0, "L", fill, 0, "")
		pdf.CellFormat(50, 12, "-  ", "0", 1, "R", fill, 0, "")
	}

	// Total Tagihan
	pdf.Ln(10)
	pdf.SetX(110)
	pdf.SetFont("Arial", "B", 12)
	pdf.SetTextColor(30, 41, 59)
	pdf.CellFormat(40, 10, "TOTAL TAGIHAN  ", "0", 0, "R", false, 0, "")
	pdf.SetFont("Arial", "B", 14)
	pdf.CellFormat(45, 10, amountStr, "B", 1, "R", false, 0, "")

	// --- 4. PAYMENT & FOOTER SECTION ---
	pdf.SetY(220)
	// Garis Pemisah
	pdf.SetDrawColor(200, 200, 200)
	pdf.Line(15, 225, 195, 225)
	
	pdf.SetFont("Arial", "B", 11)
	pdf.SetTextColor(30, 41, 59)
	pdf.Text(15, 235, "INFORMASI PEMBAYARAN")
	
	pdf.SetFont("Arial", "", 9)
	pdf.SetTextColor(71, 85, 105)
	pdf.SetXY(15, 237)
	pdf.MultiCell(0, 5, "Mohon melakukan pembayaran sesuai dengan tagihan di atas. Jika tanggal 25 belum dibayarkan layanan anda akan di suspend. Abaikan pesan ini jika Anda sudah melakukan pembayaran. Terimakasih telah menjadi pelanggan setia kami.", "", "L", false)
	
	// Footer Ikon Merah
	pdf.SetY(270)
	pdf.SetTextColor(220, 38, 38)
	pdf.SetFont("Arial", "B", 9)
	
	pdf.SetX(20)
	pdf.Cell(60, 10, "O isp.com")
	pdf.SetX(80)
	pdf.Cell(60, 10, "T 08213002392")
	pdf.SetX(140)
	pdf.Cell(60, 10, "M admin@gmail.com")

	// Version Marker
	pdf.SetY(-5)
	pdf.SetFont("Arial", "I", 6)
	pdf.SetTextColor(200, 200, 200)
	pdf.Cell(0, 5, "VER: 3.0 (Full Programmatic)")

	var buf bytes.Buffer
	err := pdf.Output(&buf)
	if err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}
