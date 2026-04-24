//go:build !server

package main

import (
	"embed"
	"log"
	"os"
	"path/filepath"
	"runtime"

	"RollCall/internal/app"
	"RollCall/internal/config"
	"RollCall/internal/database"
	"RollCall/internal/repository"
	"RollCall/internal/service"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
)

//go:embed all:frontend/dist
var assets embed.FS

func appDataDir() string {
	if runtime.GOOS == "windows" {
		exe, err := os.Executable()
		if err == nil {
			return filepath.Join(filepath.Dir(exe), "RollCall_data")
		}
	}
	if runtime.GOOS == "darwin" {
		home, _ := os.UserHomeDir()
		return filepath.Join(home, "Library", "Application Support", "RollCall")
	}
	// Linux / fallback
	home, _ := os.UserHomeDir()
	return filepath.Join(home, ".rollcall")
}

func main() {
	dataDir := appDataDir()
	os.MkdirAll(dataDir, 0755)

	configDir := filepath.Join(dataDir, "config")
	dbDir := filepath.Join(dataDir, "data")

	cfg, err := config.Load(configDir)
	if err != nil {
		log.Fatal("加载配置失败:", err)
	}
	_ = cfg

	config.Watch(configDir)

	db, err := database.Open(dbDir)
	if err != nil {
		log.Fatal("打开数据库失败:", err)
	}

	classRepo := repository.NewClassRepo(db)
	studentRepo := repository.NewStudentRepo(db)
	scoreRepo := repository.NewScoreRepo(db)
	rollcallRepo := repository.NewRollCallRepo(db)

	classSvc := service.NewClassService(classRepo, studentRepo)
	studentSvc := service.NewStudentService(studentRepo)
	rollcallSvc := service.NewRollCallService(studentRepo, rollcallRepo)
	scoreSvc := service.NewScoreService(scoreRepo, studentRepo)

	application := app.NewApp(classSvc, studentSvc, rollcallSvc, scoreSvc)

	err = wails.Run(&options.App{
		Title:     "课堂点名",
		Width:     1280,
		Height:    800,
		MinWidth:  1024,
		MinHeight: 700,
		AssetServer: &assetserver.Options{
			Assets: assets,
		},
		OnStartup: application.Startup,
		Bind: []interface{}{
			application,
		},
	})
	if err != nil {
		log.Fatal(err)
	}
}
