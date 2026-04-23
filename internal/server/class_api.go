package server

import (
	"net/http"

	"RollCall/internal/service"
)

type ClassAPI struct {
	svc *service.ClassService
}

func (a *ClassAPI) List(w http.ResponseWriter, r *http.Request) {
	list, err := a.svc.List()
	if err != nil {
		jsonErr(w, 500, err.Error())
		return
	}
	jsonOK(w, list)
}

func (a *ClassAPI) Create(w http.ResponseWriter, r *http.Request) {
	var body struct{ Name string `json:"name"` }
	if err := decodeJSON(r, &body); err != nil || body.Name == "" {
		jsonErr(w, 400, "name is required")
		return
	}
	cls, err := a.svc.Create(body.Name)
	if err != nil {
		jsonErr(w, 500, err.Error())
		return
	}
	jsonOK(w, cls)
}

func (a *ClassAPI) Update(w http.ResponseWriter, r *http.Request) {
	id, err := pathInt64(r, "id")
	if err != nil {
		jsonErr(w, 400, "invalid id")
		return
	}
	var body struct{ Name string `json:"name"` }
	if err := decodeJSON(r, &body); err != nil {
		jsonErr(w, 400, err.Error())
		return
	}
	if err := a.svc.Update(id, body.Name); err != nil {
		jsonErr(w, 500, err.Error())
		return
	}
	jsonOK(w, map[string]string{"status": "ok"})
}

func (a *ClassAPI) Delete(w http.ResponseWriter, r *http.Request) {
	id, err := pathInt64(r, "id")
	if err != nil {
		jsonErr(w, 400, "invalid id")
		return
	}
	if err := a.svc.Delete(id); err != nil {
		jsonErr(w, 500, err.Error())
		return
	}
	jsonOK(w, map[string]string{"status": "ok"})
}

func (a *ClassAPI) SetDefault(w http.ResponseWriter, r *http.Request) {
	id, err := pathInt64(r, "id")
	if err != nil {
		jsonErr(w, 400, "invalid id")
		return
	}
	if err := a.svc.SetDefault(id); err != nil {
		jsonErr(w, 500, err.Error())
		return
	}
	jsonOK(w, map[string]string{"status": "ok"})
}

func (a *ClassAPI) GetDefault(w http.ResponseWriter, r *http.Request) {
	cls, err := a.svc.GetDefault()
	if err != nil {
		jsonErr(w, 500, err.Error())
		return
	}
	jsonOK(w, cls)
}

func (a *ClassAPI) GetStudentCount(w http.ResponseWriter, r *http.Request) {
	id, err := pathInt64(r, "id")
	if err != nil {
		jsonErr(w, 400, "invalid id")
		return
	}
	count, err := a.svc.GetStudentCount(id)
	if err != nil {
		jsonErr(w, 500, err.Error())
		return
	}
	jsonOK(w, count)
}
