import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';

const profileCollection = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/profile" }),
  schema: z.object({
    nameFirst: z.string(),
    nameLast: z.string(),
    title: z.string(),
    summary: z.string(),
    email: z.string(),
    location: z.string(),
  }),
});

const aboutCollection = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/about" }),
  schema: z.object({
    title: z.string(),
  }),
});

const experienceCollection = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/experience" }),
  schema: z.object({
    title: z.string(),
    company: z.string(),
    date: z.string(),
    order: z.number(),
  }),
});

const educationCollection = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/education" }),
  schema: z.object({
    title: z.string(),
    institution: z.string(),
    date: z.string(),
    order: z.number(),
  }),
});

const skillsCollection = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/skills" }),
  schema: z.object({
    technical: z.array(z.string()),
    professional: z.array(z.string()),
    languages: z.array(z.string()),
  }),
});

const talksCollection = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/talks" }),
  schema: z.object({
    title: z.string(),
    desc: z.string(),
    date: z.date(),
    pdf_link: z.string(),
  }),
});

export const collections = {
  profile: profileCollection,
  about: aboutCollection,
  experience: experienceCollection,
  education: educationCollection,
  skills: skillsCollection,
  talks: talksCollection,
};
