package server

import (
	"fmt"
	"net/http"

	"RollCall/internal/config"
)

type ConfigAPI struct{}

func (a *ConfigAPI) Get(w http.ResponseWriter, r *http.Request) {
	jsonOK(w, config.Get())
}

func (a *ConfigAPI) Update(w http.ResponseWriter, r *http.Request) {
	var cfg config.Config
	if err := decodeJSON(r, &cfg); err != nil {
		jsonErr(w, 400, err.Error())
		return
	}
	if err := config.Save(&cfg); err != nil {
		jsonErr(w, 500, err.Error())
		return
	}
	jsonOK(w, map[string]string{"status": "ok"})
}

func (a *ConfigAPI) HasPassword(w http.ResponseWriter, r *http.Request) {
	jsonOK(w, config.HasAdminPassword())
}

func (a *ConfigAPI) VerifyPassword(w http.ResponseWriter, r *http.Request) {
	var body struct{ Password string `json:"password"` }
	if err := decodeJSON(r, &body); err != nil {
		jsonErr(w, 400, err.Error())
		return
	}
	jsonOK(w, config.VerifyAdminPassword(body.Password))
}

func (a *ConfigAPI) SetPassword(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Old string `json:"old"`
		New string `json:"new"`
	}
	if err := decodeJSON(r, &body); err != nil {
		jsonErr(w, 400, err.Error())
		return
	}
	if config.HasAdminPassword() && !config.VerifyAdminPassword(body.Old) {
		jsonErr(w, 403, fmt.Sprintf("旧密码错误"))
		return
	}
	if err := config.SetAdminPassword(body.New); err != nil {
		jsonErr(w, 500, err.Error())
		return
	}
	jsonOK(w, map[string]string{"status": "ok"})
}
