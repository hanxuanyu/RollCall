export namespace config {
	
	export class AppConfig {
	    port: number;
	    mode: string;
	
	    static createFrom(source: any = {}) {
	        return new AppConfig(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.port = source["port"];
	        this.mode = source["mode"];
	    }
	}
	export class RandomConfig {
	    mode: string;
	    avoidRepeatWindow: number;
	    weightByScore: boolean;
	
	    static createFrom(source: any = {}) {
	        return new RandomConfig(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.mode = source["mode"];
	        this.avoidRepeatWindow = source["avoidRepeatWindow"];
	        this.weightByScore = source["weightByScore"];
	    }
	}
	export class FeatureConfig {
	    enableScore: boolean;
	    enableAnimation: boolean;
	    animationDuration: number;
	    animationStyle: string;
	
	    static createFrom(source: any = {}) {
	        return new FeatureConfig(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.enableScore = source["enableScore"];
	        this.enableAnimation = source["enableAnimation"];
	        this.animationDuration = source["animationDuration"];
	        this.animationStyle = source["animationStyle"];
	    }
	}
	export class Config {
	    app: AppConfig;
	    feature: FeatureConfig;
	    random: RandomConfig;
	
	    static createFrom(source: any = {}) {
	        return new Config(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.app = this.convertValues(source["app"], AppConfig);
	        this.feature = this.convertValues(source["feature"], FeatureConfig);
	        this.random = this.convertValues(source["random"], RandomConfig);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	

}

export namespace model {
	
	export class Class {
	    id: number;
	    name: string;
	    is_default: boolean;
	    created_at: string;
	
	    static createFrom(source: any = {}) {
	        return new Class(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.is_default = source["is_default"];
	        this.created_at = source["created_at"];
	    }
	}
	export class RollCallLog {
	    id: number;
	    class_id: number;
	    mode: string;
	    count: number;
	    result: string;
	    created_at: string;
	
	    static createFrom(source: any = {}) {
	        return new RollCallLog(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.class_id = source["class_id"];
	        this.mode = source["mode"];
	        this.count = source["count"];
	        this.result = source["result"];
	        this.created_at = source["created_at"];
	    }
	}
	export class ScoreLog {
	    id: number;
	    student_id: number;
	    student_name?: string;
	    delta: number;
	    reason: string;
	    created_at: string;
	
	    static createFrom(source: any = {}) {
	        return new ScoreLog(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.student_id = source["student_id"];
	        this.student_name = source["student_name"];
	        this.delta = source["delta"];
	        this.reason = source["reason"];
	        this.created_at = source["created_at"];
	    }
	}
	export class Student {
	    id: number;
	    class_id: number;
	    name: string;
	    student_no: string;
	    gender: string;
	    score: number;
	    status: string;
	    created_at: string;
	
	    static createFrom(source: any = {}) {
	        return new Student(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.class_id = source["class_id"];
	        this.name = source["name"];
	        this.student_no = source["student_no"];
	        this.gender = source["gender"];
	        this.score = source["score"];
	        this.status = source["status"];
	        this.created_at = source["created_at"];
	    }
	}

}

export namespace service {
	
	export class StudentWeightInfo {
	    id: number;
	    name: string;
	    student_no: string;
	    score: number;
	    weight: number;
	    prob: number;
	
	    static createFrom(source: any = {}) {
	        return new StudentWeightInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.student_no = source["student_no"];
	        this.score = source["score"];
	        this.weight = source["weight"];
	        this.prob = source["prob"];
	    }
	}

}

