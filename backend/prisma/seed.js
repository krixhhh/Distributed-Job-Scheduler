const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");
  
  // Check if test user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: "admin@scheduler.com" },
  });

  if (existingUser) {
    console.log("Database already seeded or user exists.");
    return;
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash("AdminPassword123!", salt);

  // 1. Create User
  const user = await prisma.user.create({
    data: {
      email: "admin@scheduler.com",
      passwordHash: passwordHash,
      name: "Admin User",
      isVerified: true,
    },
  });
  console.log(`Created user: ${user.email}`);

  // 2. Create Organization
  const org = await prisma.organization.create({
    data: {
      name: "Default Organization",
    },
  });
  console.log(`Created organization: ${org.name}`);

  // 3. Create Org membership
  await prisma.organizationMember.create({
    data: {
      organizationId: org.id,
      userId: user.id,
      role: "OWNER",
    },
  });

  // 4. Create Project
  const project = await prisma.project.create({
    data: {
      name: "Default Project",
      description: "The default project workspace for job scheduling.",
      organizationId: org.id,
    },
  });
  console.log(`Created project: ${project.name}`);

  // 5. Create Project membership
  await prisma.projectMember.create({
    data: {
      projectId: project.id,
      userId: user.id,
      role: "ADMIN",
    },
  });

  // 6. Create default Queue
  const queue = await prisma.queue.create({
    data: {
      name: "default-queue",
      description: "Default linear-retry task queue.",
      projectId: project.id,
      concurrency: 5,
      maxAttempts: 3,
      status: "ACTIVE",
    },
  });
  console.log(`Created queue: ${queue.name}`);

  console.log("Seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
