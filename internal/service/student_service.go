package service

import (
	"encoding/csv"
	"io"
	"os"
	"strconv"
	"strings"

	"RollCall/internal/model"
	"RollCall/internal/repository"

	"github.com/xuri/excelize/v2"
)

type StudentService struct {
	repo *repository.StudentRepo
}

func NewStudentService(repo *repository.StudentRepo) *StudentService {
	return &StudentService{repo: repo}
}

func (s *StudentService) Create(classID int64, name, gender string) (*model.Student, error) {
	return s.repo.Create(&model.Student{ClassID: classID, Name: name, Gender: gender})
}

func (s *StudentService) List(classID int64) ([]model.Student, error) {
	return s.repo.ListByClassID(classID)
}

func (s *StudentService) Update(stu *model.Student) error {
	return s.repo.Update(stu)
}

func (s *StudentService) Delete(id int64) error {
	return s.repo.Delete(id)
}

func (s *StudentService) Search(classID int64, query string) ([]model.Student, error) {
	return s.repo.Search(classID, query)
}

func (s *StudentService) BatchCreate(students []model.Student) (int, error) {
	if len(students) == 0 {
		return 0, nil
	}
	return len(students), s.repo.BatchCreate(students)
}

func (s *StudentService) ParseCSV(filePath string) ([]model.Student, error) {
	f, err := os.Open(filePath)
	if err != nil {
		return nil, err
	}
	defer f.Close()
	reader := csv.NewReader(f)
	var students []model.Student
	for {
		record, err := reader.Read()
		if err == io.EOF {
			break
		}
		if err != nil {
			continue
		}
		if len(record) == 0 {
			continue
		}
		name := strings.TrimSpace(record[0])
		if name == "" || name == "姓名" || name == "name" {
			continue
		}
		stu := model.Student{Name: name}
		if len(record) > 1 {
			stu.Gender = strings.TrimSpace(record[1])
		}
		if len(record) > 2 {
			if score, err := strconv.Atoi(strings.TrimSpace(record[2])); err == nil {
				stu.Score = score
			}
		}
		students = append(students, stu)
	}
	return students, nil
}

func (s *StudentService) ParseExcel(filePath string) ([]model.Student, error) {
	f, err := excelize.OpenFile(filePath)
	if err != nil {
		return nil, err
	}
	defer f.Close()
	sheet := f.GetSheetName(0)
	rows, err := f.GetRows(sheet)
	if err != nil {
		return nil, err
	}
	var students []model.Student
	for i, row := range rows {
		if i == 0 && len(row) > 0 && (row[0] == "姓名" || row[0] == "name") {
			continue
		}
		if len(row) == 0 {
			continue
		}
		name := strings.TrimSpace(row[0])
		if name == "" {
			continue
		}
		stu := model.Student{Name: name}
		if len(row) > 1 {
			stu.Gender = strings.TrimSpace(row[1])
		}
		if len(row) > 2 {
			if score, err := strconv.Atoi(strings.TrimSpace(row[2])); err == nil {
				stu.Score = score
			}
		}
		students = append(students, stu)
	}
	return students, nil
}

func (s *StudentService) ExportCSV(classID int64, filePath string) error {
	students, err := s.repo.ListByClassID(classID)
	if err != nil {
		return err
	}
	f, err := os.Create(filePath)
	if err != nil {
		return err
	}
	defer f.Close()
	f.Write([]byte{0xEF, 0xBB, 0xBF})
	w := csv.NewWriter(f)
	w.Write([]string{"姓名", "性别", "积分", "状态"})
	for _, stu := range students {
		w.Write([]string{stu.Name, stu.Gender, strconv.Itoa(stu.Score), stu.Status})
	}
	w.Flush()
	return w.Error()
}

func (s *StudentService) ExportExcel(classID int64, filePath string) error {
	students, err := s.repo.ListByClassID(classID)
	if err != nil {
		return err
	}
	f := excelize.NewFile()
	sheet := "学生列表"
	f.SetSheetName("Sheet1", sheet)
	headers := []string{"姓名", "性别", "积分", "状态"}
	for i, h := range headers {
		cell, _ := excelize.CoordinatesToCellName(i+1, 1)
		f.SetCellValue(sheet, cell, h)
	}
	for i, stu := range students {
		row := i + 2
		f.SetCellValue(sheet, cellName(1, row), stu.Name)
		f.SetCellValue(sheet, cellName(2, row), stu.Gender)
		f.SetCellValue(sheet, cellName(3, row), stu.Score)
		f.SetCellValue(sheet, cellName(4, row), stu.Status)
	}
	return f.SaveAs(filePath)
}

func cellName(col, row int) string {
	name, _ := excelize.CoordinatesToCellName(col, row)
	return name
}
