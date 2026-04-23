package app

import (
	"RollCall/internal/model"
	"RollCall/internal/service"
)

func (a *App) DoRollCall(classID int64, count int) ([]model.Student, error) {
	return a.rollcallSvc.DoRollCall(classID, count)
}

func (a *App) ReportRollCallResult(classID int64, studentIDs []int64) ([]model.Student, error) {
	return a.rollcallSvc.ReportResult(classID, studentIDs)
}

func (a *App) GetRollCallLogs(classID int64, limit int) ([]model.RollCallLog, error) {
	return a.rollcallSvc.GetLogs(classID, limit)
}

func (a *App) ClearRollCallLogs(classID int64) error {
	return a.rollcallSvc.ClearLogs(classID)
}

func (a *App) GetWeightInfo(classID int64) ([]service.StudentWeightInfo, error) {
	return a.rollcallSvc.GetWeightInfo(classID)
}
