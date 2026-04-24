package service

import (
	"RollCall/internal/model"
	"RollCall/internal/repository"
)

type ScoreService struct {
	scoreRepo   *repository.ScoreRepo
	studentRepo *repository.StudentRepo
}

func NewScoreService(scoreRepo *repository.ScoreRepo, studentRepo *repository.StudentRepo) *ScoreService {
	return &ScoreService{scoreRepo: scoreRepo, studentRepo: studentRepo}
}

func (s *ScoreService) AddScore(studentID int64, delta int, reason string) error {
	if err := s.studentRepo.UpdateScore(studentID, delta); err != nil {
		return err
	}
	return s.scoreRepo.Create(studentID, delta, reason)
}

func (s *ScoreService) BatchAddScore(studentIDs []int64, delta int, reason string) error {
	if err := s.studentRepo.BatchUpdateScore(studentIDs, delta); err != nil {
		return err
	}
	for _, id := range studentIDs {
		s.scoreRepo.Create(id, delta, reason)
	}
	return nil
}

func (s *ScoreService) UndoScore(logID int64) error {
	log, err := s.scoreRepo.GetByID(logID)
	if err != nil {
		return err
	}
	if err := s.studentRepo.UpdateScore(log.StudentID, -log.Delta); err != nil {
		return err
	}
	return s.scoreRepo.Delete(logID)
}

func (s *ScoreService) GetLogsByStudent(studentID int64) ([]model.ScoreLog, error) {
	return s.scoreRepo.ListByStudent(studentID)
}

func (s *ScoreService) GetLogsByClass(classID int64) ([]model.ScoreLog, error) {
	return s.scoreRepo.ListByClass(classID)
}
