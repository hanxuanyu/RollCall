package app

import (
	"fmt"

	"RollCall/internal/config"
)

func (a *App) GetConfig() *config.Config {
	return config.Get()
}

func (a *App) UpdateConfig(cfg config.Config) error {
	return config.Save(&cfg)
}

func (a *App) HasAdminPassword() bool {
	return config.HasAdminPassword()
}

func (a *App) VerifyAdminPassword(password string) bool {
	return config.VerifyAdminPassword(password)
}

func (a *App) SetAdminPassword(oldPassword, newPassword string) error {
	if config.HasAdminPassword() && !config.VerifyAdminPassword(oldPassword) {
		return fmt.Errorf("旧密码错误")
	}
	return config.SetAdminPassword(newPassword)
}
