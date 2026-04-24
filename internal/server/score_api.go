package server

import (
	"net/http"

	"RollCall/internal/service"
)

type ScoreAPI struct {
	svc *service.ScoreService
}

func (a *ScoreAPI) Add(w http.ResponseWriter, r *http.Request) {
	var body struct {
		StudentID int64  `json:"student_id"`
		Delta     int    `json:"delta"`
		Reason    string `json:"reason"`
	}
	if err := decodeJSON(r, &body); err != nil {
		jsonErr(w, 400, err.Error())
		return
	}
	if err := a.svc.AddScore(body.StudentID, body.Delta, body.Reason); err != nil {
		jsonErr(w, 500, err.Error())
		return
	}
	jsonOK(w, map[string]string{"status": "ok"})
}

func (a *ScoreAPI) BatchAdd(w http.ResponseWriter, r *http.Request) {
	var body struct {
		StudentIDs []int64 `json:"student_ids"`
		Delta      int     `json:"delta"`
		Reason     string  `json:"reason"`
	}
	if err := decodeJSON(r, &body); err != nil {
		jsonErr(w, 400, err.Error())
		return
	}
	if err := a.svc.BatchAddScore(body.StudentIDs, body.Delta, body.Reason); err != nil {
		jsonErr(w, 500, err.Error())
		return
	}
	jsonOK(w, map[string]string{"status": "ok"})
}

func (a *ScoreAPI) GetLogs(w http.ResponseWriter, r *http.Request) {
	id, err := pathInt64(r, "id")
	if err != nil {
		jsonErr(w, 400, "invalid id")
		return
	}
	logs, err := a.svc.GetLogsByStudent(id)
	if err != nil {
		jsonErr(w, 500, err.Error())
		return
	}
	jsonOK(w, logs)
}

func (a *ScoreAPI) GetLogsByClass(w http.ResponseWriter, r *http.Request) {
	id, err := pathInt64(r, "id")
	if err != nil {
		jsonErr(w, 400, "invalid id")
		return
	}
	logs, err := a.svc.GetLogsByClass(id)
	if err != nil {
		jsonErr(w, 500, err.Error())
		return
	}
	jsonOK(w, logs)
}

func (a *ScoreAPI) Undo(w http.ResponseWriter, r *http.Request) {
	id, err := pathInt64(r, "id")
	if err != nil {
		jsonErr(w, 400, "invalid id")
		return
	}
	if err := a.svc.UndoScore(id); err != nil {
		jsonErr(w, 500, err.Error())
		return
	}
	jsonOK(w, map[string]string{"status": "ok"})
}
