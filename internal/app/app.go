package app

import (
	"context"

	"RollCall/internal/service"
)

type App struct {
	ctx         context.Context
	classSvc    *service.ClassService
	studentSvc  *service.StudentService
	rollcallSvc *service.RollCallService
	scoreSvc    *service.ScoreService
}

func NewApp(
	classSvc *service.ClassService,
	studentSvc *service.StudentService,
	rollcallSvc *service.RollCallService,
	scoreSvc *service.ScoreService,
) *App {
	return &App{
		classSvc:    classSvc,
		studentSvc:  studentSvc,
		rollcallSvc: rollcallSvc,
		scoreSvc:    scoreSvc,
	}
}

func (a *App) Startup(ctx context.Context) {
	a.ctx = ctx
}
