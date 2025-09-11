import { z } from 'zod';

// Base validation rules
export const ValidationRules = {
	required: (field: string) => `${field} is required`,
	minLength: (field: string, min: number) => `${field} must be at least ${min} characters`,
	maxLength: (field: string, max: number) => `${field} must be no more than ${max} characters`,
	email: 'Please enter a valid email address',
	url: 'Please enter a valid URL',
	positiveNumber: 'Must be a positive number',
	futureDate: 'Date must be in the future',
	validDuration: 'Duration must be in format like "30 min", "2 hours", etc.'
};

// Common validation schemas
export const commonSchemas = {
	title: z
		.string()
		.min(1, { message: ValidationRules.required('Title') })
		.max(200, { message: ValidationRules.maxLength('Title', 200) })
		.trim(),

	description: z
		.string()
		.max(1000, { message: ValidationRules.maxLength('Description', 1000) })
		.trim()
		.optional(),

	email: z
		.string()
		.min(1, { message: ValidationRules.required('Email') })
		.email({ message: ValidationRules.email }),

	url: z.string().url({ message: ValidationRules.url }).optional().or(z.literal('')),

	duration: z
		.string()
		.regex(/^\d+\s*(min|minute|minutes|h|hour|hours)$/i, { message: ValidationRules.validDuration })
		.optional(),

	status: z.enum(['draft', 'published', 'archived'], {
		errorMap: () => ({ message: 'Status must be draft, published, or archived' })
	}),

	tags: z
		.array(z.string().min(1).max(50))
		.max(10, { message: 'Maximum 10 tags allowed' })
		.optional(),

	price: z.number().min(0, { message: 'Price must be 0 or greater' }).optional(),

	date: z
		.date({
			required_error: ValidationRules.required('Date'),
			invalid_type_error: 'Please enter a valid date'
		})
		.optional()
};

// Course validation schema
export const courseSchema = z.object({
	title: commonSchemas.title,
	description: commonSchemas.description,
	status: commonSchemas.status,
	price: commonSchemas.price,
	thumbnail: commonSchemas.url,
	tags: commonSchemas.tags,
	estimatedDuration: commonSchemas.duration,
	prerequisites: z.array(z.string()).optional(),
	learningObjectives: z.array(z.string().min(1)).min(1, 'At least one learning objective required')
});

// Lesson validation schema
export const lessonSchema = z.object({
	title: commonSchemas.title,
	description: commonSchemas.description,
	status: commonSchemas.status,
	duration: commonSchemas.duration,
	courseId: z.string().min(1, ValidationRules.required('Course')),
	order: z.number().int().min(0, 'Order must be 0 or greater'),
	content: z.object({
		introduction: z.string().min(10, 'Introduction must be at least 10 characters'),
		coreContent: z.string().min(50, 'Core content must be at least 50 characters'),
		activities: z
			.array(
				z.object({
					type: z.enum(['quiz', 'discussion', 'exercise', 'reflection']),
					title: z.string().min(1, ValidationRules.required('Activity title')),
					content: z.string().min(1, ValidationRules.required('Activity content'))
				})
			)
			.optional(),
		reflection: z.string().min(10, 'Reflection must be at least 10 characters').optional()
	}),
	resources: z
		.array(
			z.object({
				title: z.string().min(1, ValidationRules.required('Resource title')),
				type: z.enum(['link', 'file', 'video', 'document']),
				url: commonSchemas.url.refine((val) => val !== '', 'Resource URL is required')
			})
		)
		.optional()
});

// Presentation validation schema
export const presentationSchema = z.object({
	title: commonSchemas.title,
	description: commonSchemas.description,
	slides: z
		.array(
			z.object({
				id: z.string(),
				title: z.string().optional(),
				content: z.string().min(1, 'Slide content is required'),
				type: z.enum(['title', 'content', 'image', 'video', 'code']).optional(),
				transition: z.enum(['slide', 'fade', 'zoom', 'flip']).optional(),
				notes: z.string().optional()
			})
		)
		.min(1, 'At least one slide is required'),
	theme: z.string().optional(),
	settings: z
		.object({
			autoAdvance: z.boolean().optional(),
			advanceTime: z.number().min(1000).optional(),
			showProgressBar: z.boolean().optional(),
			showSlideNumbers: z.boolean().optional(),
			enableKeyboardNavigation: z.boolean().optional()
		})
		.optional()
});

// Form field validation schema
export const formFieldSchema = z.object({
	label: z.string().min(1, ValidationRules.required('Label')),
	type: z.enum(['text', 'email', 'number', 'textarea', 'select', 'checkbox', 'radio', 'date']),
	required: z.boolean().optional(),
	placeholder: z.string().optional(),
	helpText: z.string().optional(),
	validation: z
		.object({
			minLength: z.number().min(0).optional(),
			maxLength: z.number().min(0).optional(),
			pattern: z.string().optional(),
			min: z.number().optional(),
			max: z.number().optional()
		})
		.optional(),
	options: z
		.array(
			z.object({
				label: z.string(),
				value: z.string()
			})
		)
		.optional()
});

export type CourseForm = z.infer<typeof courseSchema>;
export type LessonForm = z.infer<typeof lessonSchema>;
export type PresentationForm = z.infer<typeof presentationSchema>;
export type FormField = z.infer<typeof formFieldSchema>;
