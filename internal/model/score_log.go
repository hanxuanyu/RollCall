package model

type ScoreLog struct {
	ID          int64  `json:"id"`
	StudentID   int64  `json:"student_id"`
	StudentName string `json:"student_name,omitempty"`
	Delta       int    `json:"delta"`
	Reason      string `json:"reason"`
	CreatedAt   string `json:"created_at"`
}
