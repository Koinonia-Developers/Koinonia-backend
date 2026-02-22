import { ClassesRepository, classesRepository } from './classes.repository';

export class ClassesService {
    private repo: ClassesRepository;

    constructor() {
        this.repo = classesRepository;
    }

    async getAllActiveClasses() {
        return this.repo.getAllActiveClasses();
    }
}

export const classesService = new ClassesService();
