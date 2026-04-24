package server

import (
	"io/fs"
	"net/http"

	"RollCall/internal/service"
	"RollCall/internal/version"
)

func NewRouter(
	classSvc *service.ClassService,
	studentSvc *service.StudentService,
	rollcallSvc *service.RollCallService,
	scoreSvc *service.ScoreService,
	assets fs.FS,
) http.Handler {
	mux := http.NewServeMux()

	classAPI := &ClassAPI{svc: classSvc}
	studentAPI := &StudentAPI{svc: studentSvc}
	rollcallAPI := &RollCallAPI{svc: rollcallSvc}
	scoreAPI := &ScoreAPI{svc: scoreSvc}
	configAPI := &ConfigAPI{}

	// Class
	mux.HandleFunc("GET /api/classes", classAPI.List)
	mux.HandleFunc("POST /api/classes", classAPI.Create)
	mux.HandleFunc("PUT /api/classes/{id}", classAPI.Update)
	mux.HandleFunc("DELETE /api/classes/{id}", classAPI.Delete)
	mux.HandleFunc("PUT /api/classes/{id}/default", classAPI.SetDefault)
	mux.HandleFunc("GET /api/classes/default", classAPI.GetDefault)
	mux.HandleFunc("GET /api/classes/{id}/count", classAPI.GetStudentCount)

	// Student
	mux.HandleFunc("GET /api/classes/{classID}/students", studentAPI.List)
	mux.HandleFunc("POST /api/classes/{classID}/students", studentAPI.Create)
	mux.HandleFunc("PUT /api/students/{id}", studentAPI.Update)
	mux.HandleFunc("DELETE /api/students/{id}", studentAPI.Delete)
	mux.HandleFunc("GET /api/classes/{classID}/students/search", studentAPI.Search)
	mux.HandleFunc("POST /api/students/preview-import", studentAPI.PreviewImport)
	mux.HandleFunc("POST /api/students/preview-import-text", studentAPI.PreviewImportText)
	mux.HandleFunc("POST /api/classes/{classID}/students/import", studentAPI.Import)
	mux.HandleFunc("POST /api/classes/{classID}/students/confirm-import", studentAPI.ConfirmImport)
	mux.HandleFunc("GET /api/classes/{classID}/students/export", studentAPI.Export)

	// RollCall
	mux.HandleFunc("POST /api/classes/{classID}/rollcall", rollcallAPI.DoRollCall)
	mux.HandleFunc("POST /api/classes/{classID}/rollcall/report", rollcallAPI.ReportResult)
	mux.HandleFunc("GET /api/classes/{classID}/rollcall/logs", rollcallAPI.GetLogs)
	mux.HandleFunc("DELETE /api/classes/{classID}/rollcall/logs", rollcallAPI.ClearLogs)
	mux.HandleFunc("GET /api/classes/{classID}/rollcall/weights", rollcallAPI.GetWeightInfo)

	// Score
	mux.HandleFunc("POST /api/scores/add", scoreAPI.Add)
	mux.HandleFunc("POST /api/scores/batch", scoreAPI.BatchAdd)
	mux.HandleFunc("GET /api/scores/student/{id}", scoreAPI.GetLogs)
	mux.HandleFunc("GET /api/scores/class/{id}", scoreAPI.GetLogsByClass)
	mux.HandleFunc("DELETE /api/scores/{id}", scoreAPI.Undo)

	// Config & Admin
	mux.HandleFunc("GET /api/config", configAPI.Get)
	mux.HandleFunc("PUT /api/config", configAPI.Update)
	mux.HandleFunc("GET /api/admin/has-password", configAPI.HasPassword)
	mux.HandleFunc("POST /api/admin/verify", configAPI.VerifyPassword)
	mux.HandleFunc("POST /api/admin/set-password", configAPI.SetPassword)

	// Version
	mux.HandleFunc("GET /api/version", func(w http.ResponseWriter, r *http.Request) {
		jsonOK(w, map[string]string{
			"version":  version.Version,
			"commitId": version.CommitID,
		})
	})

	// Static files — SPA fallback
	mux.Handle("/", spaHandler(assets))

	return withCORS(mux)
}

func spaHandler(assets fs.FS) http.Handler {
	fileServer := http.FileServerFS(assets)
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		path := r.URL.Path
		// Try serving the file directly
		f, err := assets.Open(path[1:]) // strip leading /
		if err == nil {
			f.Close()
			fileServer.ServeHTTP(w, r)
			return
		}
		// SPA fallback: serve index.html
		r.URL.Path = "/"
		fileServer.ServeHTTP(w, r)
	})
}

func withCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		if r.Method == "OPTIONS" {
			w.WriteHeader(204)
			return
		}
		next.ServeHTTP(w, r)
	})
}
