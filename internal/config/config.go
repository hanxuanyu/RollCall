package config

import (
	"os"
	"path/filepath"
	"sync"

	"golang.org/x/crypto/bcrypt"
	"gopkg.in/yaml.v3"
)

type Config struct {
	App     AppConfig     `yaml:"app" json:"app"`
	Feature FeatureConfig `yaml:"feature" json:"feature"`
	Random  RandomConfig  `yaml:"random" json:"random"`
}

type AppConfig struct {
	Port              int    `yaml:"port" json:"port"`
	Mode              string `yaml:"mode" json:"mode"`
	AdminPasswordHash string `yaml:"adminPasswordHash" json:"-"`
}

type FeatureConfig struct {
	EnableScore       bool   `yaml:"enableScore" json:"enableScore"`
	EnableAnimation   bool   `yaml:"enableAnimation" json:"enableAnimation"`
	AnimationDuration int    `yaml:"animationDuration" json:"animationDuration"`
	AnimationStyle    string `yaml:"animationStyle" json:"animationStyle"`
}

type RandomConfig struct {
	Mode              string `yaml:"mode" json:"mode"`
	AvoidRepeatWindow int    `yaml:"avoidRepeatWindow" json:"avoidRepeatWindow"`
	WeightByScore     bool   `yaml:"weightByScore" json:"weightByScore"`
}

var (
	current *Config
	mu      sync.RWMutex
	cfgPath string
)

func defaultConfig() *Config {
	return &Config{
		App:     AppConfig{Port: 8080, Mode: "desktop"},
		Feature: FeatureConfig{EnableScore: true, EnableAnimation: true, AnimationDuration: 5, AnimationStyle: "ballMachine"},
		Random:  RandomConfig{Mode: "fair", AvoidRepeatWindow: 5, WeightByScore: false},
	}
}

func Load(configDir string) (*Config, error) {
	cfgPath = filepath.Join(configDir, "config.yaml")
	if err := os.MkdirAll(configDir, 0755); err != nil {
		return nil, err
	}
	cfg := defaultConfig()
	data, err := os.ReadFile(cfgPath)
	if err != nil {
		if os.IsNotExist(err) {
			out, _ := yaml.Marshal(cfg)
			os.WriteFile(cfgPath, out, 0644)
			mu.Lock()
			current = cfg
			mu.Unlock()
			return cfg, nil
		}
		return nil, err
	}
	if err := yaml.Unmarshal(data, cfg); err != nil {
		return nil, err
	}
	mu.Lock()
	current = cfg
	mu.Unlock()
	return cfg, nil
}

func Get() *Config {
	mu.RLock()
	defer mu.RUnlock()
	c := *current
	return &c
}

func Save(cfg *Config) error {
	mu.Lock()
	current = cfg
	mu.Unlock()
	data, err := yaml.Marshal(cfg)
	if err != nil {
		return err
	}
	return os.WriteFile(cfgPath, data, 0644)
}

func reload() {
	cfg := defaultConfig()
	data, err := os.ReadFile(cfgPath)
	if err != nil {
		return
	}
	if err := yaml.Unmarshal(data, cfg); err != nil {
		return
	}
	mu.Lock()
	current = cfg
	mu.Unlock()
}

func HasAdminPassword() bool {
	mu.RLock()
	defer mu.RUnlock()
	return current.App.AdminPasswordHash != ""
}

func VerifyAdminPassword(password string) bool {
	mu.RLock()
	hash := current.App.AdminPasswordHash
	mu.RUnlock()
	if hash == "" {
		return true
	}
	return bcrypt.CompareHashAndPassword([]byte(hash), []byte(password)) == nil
}

func SetAdminPassword(newPassword string) error {
	mu.Lock()
	defer mu.Unlock()
	if newPassword == "" {
		current.App.AdminPasswordHash = ""
	} else {
		hash, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
		if err != nil {
			return err
		}
		current.App.AdminPasswordHash = string(hash)
	}
	data, err := yaml.Marshal(current)
	if err != nil {
		return err
	}
	return os.WriteFile(cfgPath, data, 0644)
}
