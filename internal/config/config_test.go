package config

import "testing"

func TestSavePreservesAdminPasswordHash(t *testing.T) {
	dir := t.TempDir()

	cfg, err := Load(dir)
	if err != nil {
		t.Fatalf("Load() error = %v", err)
	}
	cfg.App.AdminPasswordHash = "hash-value"
	if err := Save(cfg); err != nil {
		t.Fatalf("Save() with password hash error = %v", err)
	}

	updated := Get()
	updated.Random.Mode = "weighted"
	updated.App.AdminPasswordHash = ""
	if err := Save(updated); err != nil {
		t.Fatalf("Save() without password hash error = %v", err)
	}

	reloaded, err := Load(dir)
	if err != nil {
		t.Fatalf("Reload Load() error = %v", err)
	}
	if reloaded.App.AdminPasswordHash != "hash-value" {
		t.Fatalf("AdminPasswordHash = %q, want %q", reloaded.App.AdminPasswordHash, "hash-value")
	}
	if reloaded.Random.Mode != "weighted" {
		t.Fatalf("Random.Mode = %q, want %q", reloaded.Random.Mode, "weighted")
	}
}
