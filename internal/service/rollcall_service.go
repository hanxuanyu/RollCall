package service

import (
	"encoding/json"
	"fmt"
	"log"
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

	// Debug: log weights and probabilities
	totalWeight := 0.0
	for _, c := range candidates {
		totalWeight += c.weight
	}
	log.Printf("[RollCall] mode=%s, students=%d, count=%d, avoidWindow=%d",
		cfg.Random.Mode, len(students), count, cfg.Random.AvoidRepeatWindow)
	for _, c := range candidates {
		prob := 0.0
		if totalWeight > 0 {
			prob = c.weight / totalWeight * 100
		}
		log.Printf("[RollCall]   %s (id=%d, score=%d): weight=%.4f, prob=%.2f%%",
			c.student.Name, c.student.ID, c.student.Score, c.weight, prob)
	}

	selected := weightedSelectN(candidates, count)

	log.Printf("[RollCall] selected:")
	for _, stu := range selected {
		log.Printf("[RollCall]   -> %s (id=%d)", stu.Name, stu.ID)
	}

	return selected, nil
}

func (s *RollCallService) GetLogs(classID int64, limit int) ([]model.RollCallLog, error) {
	if limit <= 0 {
		limit = 20
	}
	return s.rollcallRepo.ListByClassID(classID, limit)
}

type StudentWeightInfo struct {
	ID        int64   `json:"id"`
	Name      string  `json:"name"`
	StudentNo string  `json:"student_no"`
	Score     int     `json:"score"`
	Weight    float64 `json:"weight"`
	Prob      float64 `json:"prob"`
}

func (s *RollCallService) GetWeightInfo(classID int64) ([]StudentWeightInfo, error) {
	cfg := config.Get()

	students, err := s.studentRepo.ListActiveByClassID(classID)
	if err != nil {
		return nil, err
	}
	if len(students) == 0 {
		return nil, nil
	}

	recentIDs, _ := s.rollcallRepo.GetRecentPickedStudentIDs(classID, cfg.Random.AvoidRepeatWindow)
	recentCount := countOccurrences(recentIDs)
	candidates := s.buildCandidates(students, recentCount, cfg)

	totalWeight := 0.0
	for _, c := range candidates {
		totalWeight += c.weight
	}

	var result []StudentWeightInfo
	for _, c := range candidates {
		prob := 0.0
		if totalWeight > 0 {
			prob = c.weight / totalWeight * 100
		}
		result = append(result, StudentWeightInfo{
			ID:        c.student.ID,
			Name:      c.student.Name,
			StudentNo: c.student.StudentNo,
			Score:     c.student.Score,
			Weight:    math.Round(c.weight*10000) / 10000,
			Prob:      math.Round(prob*100) / 100,
		})
	}
	return result, nil
}

func (s *RollCallService) ClearLogs(classID int64) error {
	return s.rollcallRepo.DeleteByClassID(classID)
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
	maxScore := 0
	for _, st := range students {
		if st.Score > maxScore {
			maxScore = st.Score
		}
	}

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
			base := float64(maxScore-stu.Score) + 10
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
