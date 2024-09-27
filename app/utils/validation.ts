import { z } from "zod";

type FieldErrors = {
  [key: string]: string;
};

export function validateForm<T>(
  formData: FormData,
  zodSchema: z.Schema<T>,
  successFn: (data: T) => unknown,
  errorsFn: (errors: FieldErrors) => unknown
) {
  const result = zodSchema.safeParse(Object.fromEntries(formData));
  if (!result.success) {
    const errors: FieldErrors = {};
    // consultar la documentación de la gestión de errores con zod (https://zod.dev/ERROR_HANDLING)
    result.error.issues.forEach((issue) => {
      const path = issue.path.join(".");

      errors[path] = issue.message;
    });
    return errorsFn(errors);
  }
  return successFn(result.data);
}
