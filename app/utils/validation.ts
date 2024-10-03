import { z } from "zod";

type FieldErrors = {
  [key: string]: string;
};

/*
Para entender la necesidad de objectify:
Tiene que ver con que los FormData permiten asociar a un único nombre varios valores, como ocurre con los ingredientes.

Ejemplo:

const f  = new FormData()
f.append("fruits","orange") // añade al nombre "fruits" el valor "orange"
f.append("fruits","apple") // añade al nombre "fruits" el valor "apple"
f.get("fruits") // devuelve sólo "orange"
f.getAll("fruits") // devuelve ["orange","apple"]

Object.fromEntries(f) // devuelve {fruits: "orange"} // sólo el primer valor
Esta función, fromEntries, es la que estamos usando en la función validateForm pero sólo se obtiene un valor,
La función objectify se encarga de obtener todos los valores asociados a un nombre y devolver un objeto con todos los valores asociados a un nombre.
*/

type FormFields = {
  [key: string]: FormDataEntryValue | FormDataEntryValue[];
};

function objectify(formData: FormData) {
  const formFields: FormFields = {};
  formData.forEach((value, name) => {
    const isArrayField = name.endsWith("[]");
    const fieldName = isArrayField ? name.slice(0, -2) : name;

    if (!(fieldName in formFields)) {
      formFields[fieldName] = isArrayField ? formData.getAll(name) : value;
    }
  });
  return formFields;
}

export function validateForm<T>(
  formData: FormData,
  zodSchema: z.Schema<T>,
  successFn: (data: T) => unknown,
  errorsFn: (errors: FieldErrors) => unknown
) {
  const fields = objectify(formData);

  console.log("fields", fields);
  const result = zodSchema.safeParse(fields);
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
