import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const SALT_ROUNDS = 12;

const executives = [
    {
        name: 'Kibrom Abebe',
        email: 'kibromabebe@gmail.com',
        role: 'SECRETARIAT_CHAIRMAN',
        serviceClass: null
    },
    {
        name: 'Dn. Tesfahun Nigus',
        email: 'tesfahuntnigus@gmail.com',
        role: 'SECRETARIAT_VICE',
        serviceClass: null
    },
    {
        name: 'Tigist Gebru',
        email: 'tigistgebru@gmail.com',
        role: 'SECRETARIAT_SECRETARY',
        serviceClass: null
    },
    {
        name: 'Dn. Nahom G/Medhin',
        email: 'nahomgmedhin@gmail.com',
        role: 'SERVICE_MANAGER',
        serviceClass: 'ትምርት ክፍል'
    },
    {
        name: 'Rediet Tsegay',
        email: 'rediettsegay@gmail.com',
        role: 'SERVICE_MANAGER',
        serviceClass: 'መዝሙር ክፍል'
    },
    {
        name: 'Dn. Tewodros Beyene',
        email: 'tewodrosbeyene@gmail.com',
        role: 'SERVICE_MANAGER',
        serviceClass: 'ጉዳይ ኣባላት'
    },
    {
        name: 'Dn. Kibrom G/Selassie',
        email: 'kibromgselassie@gmail.com',
        role: 'SERVICE_MANAGER',
        serviceClass: 'ልምዓት ክፍል'
    },
    {
        name: 'Henok Elias',
        email: 'henokelias@gmail.com',
        role: 'SERVICE_MANAGER',
        serviceClass: 'ሞያን ኣገልግሎት'
    },
    {
        name: 'Yirga Getachew',
        email: 'yirgagetachew@gmail.com',
        role: 'SERVICE_MANAGER',
        serviceClass: 'ባች ክፍል'
    },
    {
        name: 'Aklil G/Egziabher',
        email: 'akillegizabher@gmail.com',
        role: 'SERVICE_MANAGER',
        serviceClass: 'ሳንሱር'
    },
    {
        name: 'Masho Hadush',
        email: 'mashohadush@gmail.com',
        role: 'SERVICE_MANAGER',
        serviceClass: 'ሕሳብ'
    },
    {
        name: 'Abel Guesh',
        email: 'abelguesh@gmail.com',
        role: 'SERVICE_MANAGER',
        serviceClass: 'ኦዲት'
    }
];

async function seedExecutives() {
    console.log('Starting to seed executive members...');

    // Get all service classes
    const serviceClasses = await prisma.serviceClass.findMany();
    console.log(`Found ${serviceClasses.length} service classes`);

    for (const exec of executives) {
        try {
            // Check if user already exists
            const existingUser = await prisma.user.findUnique({
                where: { email: exec.email }
            });

            if (existingUser) {
                console.log(`User ${exec.email} already exists, skipping...`);
                continue;
            }

            // Find service class if needed
            let serviceClassId = null;
            if (exec.serviceClass) {
                const serviceClass = serviceClasses.find(sc => 
                    sc.class_name_amharic === exec.serviceClass || 
                    sc.class_name_amharic.includes(exec.serviceClass!)
                );
                if (serviceClass) {
                    serviceClassId = serviceClass.id;
                } else {
                    console.warn(`Service class not found for ${exec.serviceClass}, creating without service class`);
                }
            }

            // Create user with role directly (bypassing business rules)
            const passwordHash = await bcrypt.hash('12345678', SALT_ROUNDS);
            
            const user = await prisma.user.create({
                data: {
                    full_name_three_parts: exec.name,
                    email: exec.email,
                    password_hash: passwordHash,
                    system_role: exec.role as any,
                    service_class_id: serviceClassId,
                    phone_number: '0909090909',
                    sex: Math.random() > 0.5 ? 'MALE' : 'FEMALE',
                    clerical_rank: 'NONE',
                    academic_dept: ['Computer Science', 'Medicine', 'Law', 'Engineering', 'Business'][Math.floor(Math.random() * 5)],
                    academic_year: Math.floor(Math.random() * 5) + 1,
                    dorm_block: ['A', 'B', 'C'][Math.floor(Math.random() * 3)],
                    dorm_room: String(Math.floor(Math.random() * 500) + 100),
                    profile_image_url: '/assets/avatar.png',
                    bio: 'Executive member of Enda Eyesus Fellowship',
                    created_at: new Date(),
                    updated_at: new Date()
                }
            });

            console.log(`✓ Created ${exec.name} (${exec.role})`);
        } catch (error) {
            console.error(`✗ Failed to create ${exec.name}:`, error);
        }
    }

    console.log('Seeding completed!');
}

seedExecutives()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
