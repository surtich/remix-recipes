import classNames from "classnames";
import { ErrorMessage, PrimaryButton } from "~/components/forms";

export default function Login() {
  return (
    <div className="text-center mt-36">
      <h1 className="text-3xl mb-8">Remix recipes</h1>
      <form method="post" className="mx-auto md:w-1/3">
        <div className="text-left pb-4">
          <input
            type="email"
            name="email"
            placeholder="Email"
            autoComplete="off"
            className={classNames(
              "w-full outline-none border-2 border-grey-200",
              "focus:border-primary rounded-md p-2"
            )}
          />
          <ErrorMessage></ErrorMessage>
        </div>
        <PrimaryButton className="w-1/3 mx-auto">Log in</PrimaryButton>
      </form>
    </div>
  );
}
