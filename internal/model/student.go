package model

type Student struct {
	ID        int64  `json:"id"`
	ClassID   int64  `json:"class_id"`
	Name      string `json:"name"`
	Gender    string `json:"gender"`
	Score     int    `json:"score"`
	Status    string `json:"status"`
	CreatedAt string `json:"created_at"`
}
