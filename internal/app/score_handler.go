package app

import "RollCall/internal/model"

func (a *App) AddScore(studentID int64, delta int, reason string) error {
	return a.scoreSvc.AddScore(studentID, delta, reason)
}

func (a *App) BatchAddScore(studentIDs []int64, delta int, reason string) error {
	return a.scoreSvc.BatchAddScore(studentIDs, delta, reason)
}

func (a *App) GetScoreLogs(studentID int64) ([]model.ScoreLog, error) {
	return a.scoreSvc.GetLogsByStudent(studentID)
}

func (a *App) GetScoreLogsByClass(classID int64) ([]model.ScoreLog, error) {
	return a.scoreSvc.GetLogsByClass(classID)
}
