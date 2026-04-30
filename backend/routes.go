package main

import "github.com/labstack/echo/v4"

// registerRoutes mendaftarkan semua API route ke Echo instance.
// Dipindahkan dari main.go agar main.go tetap ringkas.
func (a *appState) registerRoutes(e *echo.Echo) {
	// Auth
	e.POST("/api/login", a.handleLogin)

	// Workspace management
	e.POST("/api/workspaces", a.handleCreateWorkspace)
	e.GET("/api/workspaces", a.handleListWorkspaces)
	e.GET("/api/workspaces/:id/dashboard-summary", a.handleGetDashboardSummary)
	e.PUT("/api/workspaces/:id", a.handleUpdateWorkspace)
	e.PUT("/api/workspaces/:id/settings", a.handleUpdateWorkspaceSettings)
	e.PUT("/api/workspaces/:id/smtp", a.handleUpdateWorkspaceSmtpSettings)
	e.DELETE("/api/workspaces/:id", a.handleDeleteWorkspace)
	e.POST("/api/settings/test-smtp", a.handleTestSMTP)

	// Users management
	e.POST("/api/users", a.handleCreateUser)
	e.GET("/api/users", a.handleListUsers)
	e.DELETE("/api/users/:id", a.handleDeleteUser)

	// Devices management
	e.POST("/api/devices", a.handleCreateDevice)
	e.GET("/api/devices", a.handleListDevices)
	e.PUT("/api/devices/:id", a.handleUpdateDevice)
	e.DELETE("/api/devices/:id", a.handleDeleteDevice)
	e.POST("/api/devices/test-connection", a.handleTestDeviceConnection)

	// Monitoring & Traffic
	e.GET("/api/monitoring/ping", a.handlePingDevices)
	e.GET("/api/monitoring/ping-logs/:id", a.handleGetDevicePingLogs)
	e.GET("/api/monitoring/ping-history/:id", a.handleGetPingHistory)
	e.GET("/api/monitoring/ping-history/:id/export", a.handleExportPingHistoryCSV)
	e.GET("/api/monitoring/uptime-report/:id", a.handleGetYearlyUptimeReport)
	e.PUT("/api/devices/:id/ping-interval", a.handleUpdatePingInterval)
	e.GET("/api/monitoring/interfaces/:id", a.handleListDeviceInterfaces)
	e.GET("/api/monitoring/traffic/:id", a.handleGetInterfaceTraffic)
	e.GET("/api/monitoring/queues/:id", a.handleListDeviceQueues)
	e.GET("/api/monitoring/queue-traffic/:id", a.handleGetQueueTraffic)
	e.GET("/api/monitoring/summary", a.handleMonitoringSummary)
	e.GET("/api/monitoring/alerts", a.handleGetAlerts)

	// Topology
	e.GET("/api/workspaces/:id/topology-layouts", a.handleGetTopologyLayouts)
	e.POST("/api/workspaces/:id/topology-layouts", a.handleCreateTopologyLayout)
	e.DELETE("/api/workspaces/:id/topology-layouts/:layoutId", a.handleDeleteTopologyLayout)
	e.GET("/api/workspaces/:id/topology-layouts/:layoutId/data", a.handleGetTopology)
	e.POST("/api/workspaces/:id/topology-layouts/:layoutId/data", a.handleSaveTopology)

	// Customers
	e.GET("/api/customers/queues", a.handleGetCustomerQueues)
	e.GET("/api/customers", a.handleListCustomers)
	e.POST("/api/customers", a.handleCreateCustomer)
	e.PUT("/api/customers/:id", a.handleUpdateCustomer)
	e.DELETE("/api/customers/:id", a.handleDeleteCustomer)

	// Customer Portal
	e.GET("/api/customer/:id/dashboard", a.handleCustomerGetDashboard)
	e.GET("/api/customer/:id/usage", a.handleCustomerGetUsage)
	e.GET("/api/customer/:id/invoices", a.handleCustomerGetInvoices)

	// Invoices
	e.GET("/api/invoices", a.handleListInvoices)
	e.POST("/api/invoices", a.handleCreateInvoice)
	e.PUT("/api/invoices/:id/status", a.handleUpdateInvoiceStatus)
	e.POST("/api/invoices/:id/send-email", a.handleSendInvoiceEmail)
	e.DELETE("/api/invoices/:id", a.handleDeleteInvoice)

	// Packages
	e.GET("/api/packages", a.handleListPackages)
	e.POST("/api/packages", a.handleCreatePackage)
	e.DELETE("/api/packages/:id", a.handleDeletePackage)

	// Services
	e.GET("/api/services", a.handleListServices)
	e.POST("/api/services", a.handleCreateService)
	e.PUT("/api/services/:id", a.handleUpdateService)
	e.DELETE("/api/services/:id", a.handleDeleteService)

	// Analytics
	e.GET("/api/analytics/top-talkers", a.handleGetTopTalkers)
	e.GET("/api/analytics/top-protocols", a.handleGetProtocolBreakdown)
	e.GET("/api/analytics/flow-logs", a.handleGetFlowLogs)
	e.GET("/api/analytics/top-apps", a.handleGetApplicationBreakdown)
	e.GET("/api/analytics/active-devices", a.handleGetActiveAnalyticsDevices)
	e.GET("/api/monitoring/sla-stats", a.handleGetSLAStats)

	// IP Management (IPAM)
	e.GET("/api/ip-pools", a.handleListIPPools)
	e.POST("/api/ip-pools", a.handleCreateIPPool)
	e.PUT("/api/ip-pools/:id", a.handleUpdateIPPool)
	e.DELETE("/api/ip-pools/:id", a.handleDeleteIPPool)
	e.GET("/api/ipam/ips", a.handleListIPAddresses)
	e.POST("/api/ipam/ips", a.handleCreateIPAddress)
	e.PUT("/api/ipam/ips/:id", a.handleUpdateIPAddress)
	e.DELETE("/api/ipam/ips/:id", a.handleDeleteIPAddress)
	e.POST("/api/ipam/networks/:id/generate", a.handleGenerateIPs)

	// System Info
	e.GET("/api/system/metrics", a.handleSystemMetrics)

	// Security Alerts
	e.GET("/api/security/alerts", a.handleListSecurityAlerts)
	e.PUT("/api/security/alerts/:id/resolve", a.handleResolveSecurityAlert)
	e.DELETE("/api/security/alerts/:id", a.handleDeleteSecurityAlert)
}
