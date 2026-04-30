package main

import (
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/labstack/echo/v4"
)

type securityAlert struct {
	ID            int      `json:"id"`
	WorkspaceID   int      `json:"workspaceId"`
	DeviceID      *int     `json:"deviceId"`
	AlertType     string   `json:"alertType"`
	SourceIP      string   `json:"sourceIp"`
	DestinationIP string   `json:"destinationIp"`
	Severity      string   `json:"severity"`
	Description   string   `json:"description"`
	MetricValue   float64  `json:"metricValue"`
	IsResolved    bool     `json:"isResolved"`
	CreatedAt     time.Time `json:"createdAt"`
}

func (a *appState) handleListSecurityAlerts(c echo.Context) error {
	ctx := c.Request().Context()
	wsIDStr := c.QueryParam("workspaceId")
	wsID, _ := strconv.Atoi(wsIDStr)
	
	devIDStr := c.QueryParam("deviceId")
	devID, _ := strconv.Atoi(devIDStr)

	query := `
		SELECT id, workspace_id, device_id, alert_type, source_ip, destination_ip, severity, description, metric_value, is_resolved, created_at
		FROM security_alerts
		WHERE ($1 = 0 OR workspace_id = $1)
		  AND ($2 = 0 OR device_id = $2)
		ORDER BY created_at DESC
		LIMIT 100
	`
	rows, err := a.db.Query(ctx, query, wsID, devID)
	if err != nil {
		log.Printf("List security alerts error: %v", err)
		return c.String(http.StatusInternalServerError, "failed to fetch alerts")
	}
	defer rows.Close()

	var alerts []securityAlert
	for rows.Next() {
		var al securityAlert
		err := rows.Scan(&al.ID, &al.WorkspaceID, &al.DeviceID, &al.AlertType, &al.SourceIP, &al.DestinationIP, &al.Severity, &al.Description, &al.MetricValue, &al.IsResolved, &al.CreatedAt)
		if err != nil {
			log.Printf("Security Alerts: scan error: %v", err)
			continue
		}
		alerts = append(alerts, al)
	}

	if alerts == nil {
		alerts = []securityAlert{}
	}

	return c.JSON(http.StatusOK, alerts)
}

func (a *appState) handleResolveSecurityAlert(c echo.Context) error {
	ctx := c.Request().Context()
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		return c.String(http.StatusBadRequest, "invalid alert id")
	}

	_, err = a.db.Exec(ctx, "UPDATE security_alerts SET is_resolved = TRUE WHERE id = $1", id)
	if err != nil {
		return c.String(http.StatusInternalServerError, "failed to resolve alert")
	}

	return c.NoContent(http.StatusNoContent)
}

func (a *appState) handleDeleteSecurityAlert(c echo.Context) error {
	ctx := c.Request().Context()
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		return c.String(http.StatusBadRequest, "invalid alert id")
	}

	_, err = a.db.Exec(ctx, "DELETE FROM security_alerts WHERE id = $1", id)
	if err != nil {
		return c.String(http.StatusInternalServerError, "failed to delete alert")
	}

	return c.NoContent(http.StatusNoContent)
}
