package service

import (
	"encoding/json"
	"fmt"
	"math"
	"math/rand/v2"

	"RollCall/internal/config"
	"RollCall/internal/model"
	"RollCall/internal/repository"
)

type RollCallService struct {
	studentRepo  *repository.StudentRepo
	rollcallRepo *repository.RollCallRepo
}

func NewRollCallService(studentRepo *repository.StudentRepo, rollcallRepo *repository.RollCallRepo) *RollCallService {
	return &RollCallService{studentRepo: studentRepo, rollcallRepo: rollcallRepo}
}

type candidate struct {
	student model.Student
	weight  float64
}

func (s *RollCallService) DoRollCall(classID int64, count int) ([]model.Student, error) {
	cfg := config.Get()

	students, err := s.studentRepo.ListActiveByClassID(classID)
	if err != nil {
		return nil, err
	}
	if len(students) == 0 {
		return nil, fmt.Errorf("没有可用的学生")
	}
	if count > len(students) {
		count = len(students)
	}

	recentIDs, _ := s.rollcallRepo.GetRecentPickedStudentIDs(classID, cfg.Random.AvoidRepeatWindow)
	recentCount := countOccurrences(recentIDs)

	candidates := s.buildCandidates(students, recentCount, cfg)
	selected := weightedSelectN(candidates, count)

	return selected, nil
}

func (s *RollCallService) GetLogs(classID int64, limit int) ([]model.RollCallLog, error) {
	if limit <= 0 {
		limit = 20
	}
	return s.rollcallRepo.ListByClassID(classID, limit)
}

func (s *RollCallService) ReportResult(classID int64, studentIDs []int64) ([]model.Student, error) {
	cfg := config.Get()

	resultJSON, _ := json.Marshal(studentIDs)
	s.rollcallRepo.Create(&model.RollCallLog{
		ClassID: classID,
		Mode:    cfg.Random.Mode,
		Count:   len(studentIDs),
		Result:  string(resultJSON),
	})

	var students []model.Student
	for _, id := range studentIDs {
		stu, err := s.studentRepo.GetByID(id)
		if err != nil {
			continue
		}
		students = append(students, *stu)
	}
	return students, nil
}

func (s *RollCallService) buildCandidates(students []model.Student, recentCount map[int64]int, cfg *config.Config) []candidate {
	var candidates []candidate
	for _, stu := range students {
		w := 1.0
		switch cfg.Random.Mode {
		case "random":
			w = 1.0
		case "fair":
			if cnt, ok := recentCount[stu.ID]; ok {
				w = 1.0 / float64(1+cnt)
			}
		case "weighted":
			base := float64(stu.Score + 100)
			if base < 1 {
				base = 1
			}
			w = base
			if cnt, ok := recentCount[stu.ID]; ok {
				w = w / float64(1+cnt)
			}
		}
		candidates = append(candidates, candidate{student: stu, weight: w})
	}
	return candidates
}

// Efraimidis-Spirakis weighted sampling without replacement
func weightedSelectN(candidates []candidate, n int) []model.Student {
	if n >= len(candidates) {
		result := make([]model.Student, len(candidates))
		for i, c := range candidates {
			result[i] = c.student
		}
		return result
	}

	type keyed struct {
		key     float64
		student model.Student
	}
	items := make([]keyed, len(candidates))
	for i, c := range candidates {
		u := rand.Float64()
		if u == 0 {
			u = 1e-10
		}
		items[i] = keyed{
			key:     math.Pow(u, 1.0/c.weight),
			student: c.student,
		}
	}

	// Partial sort: find top-N by key (descending)
	for i := 0; i < n; i++ {
		maxIdx := i
		for j := i + 1; j < len(items); j++ {
			if items[j].key > items[maxIdx].key {
				maxIdx = j
			}
		}
		items[i], items[maxIdx] = items[maxIdx], items[i]
	}

	result := make([]model.Student, n)
	for i := 0; i < n; i++ {
		result[i] = items[i].student
	}
	return result
}

func countOccurrences(ids []int64) map[int64]int {
	m := make(map[int64]int)
	for _, id := range ids {
		m[id]++
	}
	return m
}
