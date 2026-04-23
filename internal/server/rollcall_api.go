package server

import (
	"net/http"

	"RollCall/internal/service"
)

type RollCallAPI struct {
	svc *service.RollCallService
}

func (a *RollCallAPI) DoRollCall(w http.ResponseWriter, r *http.Request) {
	classID, err := pathInt64(r, "classID")
	if err != nil {
		jsonErr(w, 400, "invalid classID")
		return
	}
	var body struct{ Count int `json:"count"` }
	if err := decodeJSON(r, &body); err != nil || body.Count <= 0 {
		jsonErr(w, 400, "count is required")
		return
	}
	selected, err := a.svc.DoRollCall(classID, body.Count)
	if err != nil {
		jsonErr(w, 500, err.Error())
		return
	}
	jsonOK(w, selected)
}

func (a *RollCallAPI) ReportResult(w http.ResponseWriter, r *http.Request) {
	classID, err := pathInt64(r, "classID")
	if err != nil {
		jsonErr(w, 400, "invalid classID")
		return
	}
	var body struct{ StudentIDs []int64 `json:"student_ids"` }
	if err := decodeJSON(r, &body); err != nil {
		jsonErr(w, 400, err.Error())
		return
	}
	students, err := a.svc.ReportResult(classID, body.StudentIDs)
	if err != nil {
		jsonErr(w, 500, err.Error())
		return
	}
	jsonOK(w, students)
}

func (a *RollCallAPI) GetLogs(w http.ResponseWriter, r *http.Request) {
	classID, err := pathInt64(r, "classID")
	if err != nil {
		jsonErr(w, 400, "invalid classID")
		return
	}
	limit := queryInt(r, "limit", 20)
	logs, err := a.svc.GetLogs(classID, limit)
	if err != nil {
		jsonErr(w, 500, err.Error())
		return
	}
	jsonOK(w, logs)
}

func (a *RollCallAPI) ClearLogs(w http.ResponseWriter, r *http.Request) {
	classID, err := pathInt64(r, "classID")
	if err != nil {
		jsonErr(w, 400, "invalid classID")
		return
	}
	if err := a.svc.ClearLogs(classID); err != nil {
		jsonErr(w, 500, err.Error())
		return
	}
	jsonOK(w, map[string]string{"status": "ok"})
}

func (a *RollCallAPI) GetWeightInfo(w http.ResponseWriter, r *http.Request) {
	classID, err := pathInt64(r, "classID")
	if err != nil {
		jsonErr(w, 400, "invalid classID")
		return
	}
	info, err := a.svc.GetWeightInfo(classID)
	if err != nil {
		jsonErr(w, 500, err.Error())
		return
	}
	jsonOK(w, info)
}
