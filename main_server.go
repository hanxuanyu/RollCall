//go:build server

package main

import (
	"embed"
	"fmt"
	"io/fs"
	"log"
	"net/http"

	"RollCall/internal/config"
	"RollCall/internal/database"
	"RollCall/internal/repository"
	"RollCall/internal/server"
	"RollCall/internal/service"
)

//go:embed all:frontend/dist
var serverAssets embed.FS

func main() {
	cfg, err := config.Load("./config")
	if err != nil {
		log.Fatal("加载配置失败:", err)
	}

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

	distFS, err := fs.Sub(serverAssets, "frontend/dist")
	if err != nil {
		log.Fatal("读取前端资源失败:", err)
	}

	router := server.NewRouter(classSvc, studentSvc, rollcallSvc, scoreSvc, distFS)

	port := cfg.App.Port
	if port == 0 {
		port = 8080
	}
	addr := fmt.Sprintf(":%d", port)
	log.Printf("RollCallServer 启动在 http://localhost%s", addr)
	if err := http.ListenAndServe(addr, router); err != nil {
		log.Fatal(err)
	}
}
