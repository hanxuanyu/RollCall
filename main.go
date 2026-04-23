package main

import (
	"embed"
	"log"

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

func main() {
	cfg, err := config.Load("./config")
	if err != nil {
		log.Fatal("加载配置失败:", err)
	}
	_ = cfg

	config.Watch("./config")

	db, err := database.Open("./data")
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
