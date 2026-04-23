package service

import (
	"RollCall/internal/model"
	"RollCall/internal/repository"
)

type ClassService struct {
	repo        *repository.ClassRepo
	studentRepo *repository.StudentRepo
}

func NewClassService(repo *repository.ClassRepo, studentRepo *repository.StudentRepo) *ClassService {
	return &ClassService{repo: repo, studentRepo: studentRepo}
}

func (s *ClassService) Create(name string) (*model.Class, error) {
	return s.repo.Create(name)
}

func (s *ClassService) List() ([]model.Class, error) {
	return s.repo.List()
}

func (s *ClassService) Update(id int64, name string) error {
	return s.repo.Update(id, name)
}

func (s *ClassService) Delete(id int64) error {
	return s.repo.Delete(id)
}

func (s *ClassService) SetDefault(id int64) error {
	return s.repo.SetDefault(id)
}

func (s *ClassService) GetDefault() (*model.Class, error) {
	return s.repo.GetDefault()
}

func (s *ClassService) GetStudentCount(classID int64) (int, error) {
	return s.studentRepo.CountByClassID(classID)
}
