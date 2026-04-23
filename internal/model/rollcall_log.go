package model

type RollCallLog struct {
	ID        int64  `json:"id"`
	ClassID   int64  `json:"class_id"`
	Mode      string `json:"mode"`
	Count     int    `json:"count"`
	Result    string `json:"result"`
	CreatedAt string `json:"created_at"`
}
