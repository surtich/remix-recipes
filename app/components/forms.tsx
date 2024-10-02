import { Form, useNavigation, useSearchParams } from "@remix-run/react";
import classNames from "classnames";
import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  InputHTMLAttributes,
} from "react";
import { SearchIcon } from "./icons";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
}

export function Button({ children, className, ...props }: ButtonProps) {
  return (
    <button
      {...props}
      className={classNames(
        "flex px-3 py-2 rounded-md justify-center",
        className
      )}
    >
      {children}
    </button>
  );
}

export function PrimaryButton({ className, isLoading, ...props }: ButtonProps) {
  return (
    <Button
      {...props}
      className={classNames(
        "text-white bg-primary hover:bg-primary-light",
        isLoading ? "bg-primary-light " : "",
        className
      )}
    />
  );
}

export function DeleteButton({ className, isLoading, ...props }: ButtonProps) {
  return (
    <Button
      {...props}
      className={classNames(
        "border-2 border-red-2 text-red-600",
        "hover:bg-red-600 hover:text-white",
        isLoading ? "border-red-400 text-red-400" : "",
        className
      )}
    />
  );
}

interface ErrorMessageProps extends HTMLAttributes<HTMLParagraphElement> {}

export function ErrorMessage({ className, ...props }: ErrorMessageProps) {
  return props.children ? (
    <p {...props} className={classNames("text-red-600 text-sm", className)} />
  ) : null;
}

interface PrimaryInputProps extends InputHTMLAttributes<HTMLInputElement> {}

export function PrimaryInput({ className, ...props }: PrimaryInputProps) {
  return (
    <input
      {...props}
      className={classNames(
        "w-full outline-none border-2 border-grey-200",
        "focus:border-primary rounded-md p-2",
        className
      )}
    />
  );
}

type SearchBarProps = {
  placeholder?: string;
};

export function SearchBar({ placeholder = "Search..." }: SearchBarProps) {
  const [searchParams] = useSearchParams();
  const navigation = useNavigation();
  const isSearching = navigation.formData?.has("q"); // formData es un tipo de la API FormData (https://developer.mozilla.org/en-US/docs/Web/API/FormData)

  return (
    <Form
      className={classNames(
        "flex border-2 border-gray-300 rounded-md",
        "focus-within:border-primary md:w-80",
        isSearching ? "animate-pulse" : ""
      )}
    >
      <button className="px-2 mr-1">
        <SearchIcon />
      </button>
      <input
        type="text"
        name="q"
        defaultValue={searchParams.get("q") ?? ""}
        autoComplete="off"
        placeholder={placeholder}
        className="w-full py-3 px-2 outline-none"
      />
    </Form>
  );
}
