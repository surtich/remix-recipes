import { Link } from "@remix-run/react";
import ReactModal from "react-modal";
import { XIcon } from "~/components/icons";

if (typeof window !== "undefined") {
  ReactModal.setAppElement("body"); // un selector válido en css
}

export default function UpdateMealPlan() {
  return (
    <ReactModal isOpen className="md:h-fit lg:w-1/2 md:mx-auto md:mt-24">
      <div className="p-4 rounded-md bg-white shadow-md">
        <div className="flex justify-between mb-8">
          <h1 className="text-lg font-bold">Update Meal Plan</h1>
          <Link
            to=".."
            replace /* evita que se añada al historial de navegación*/
          >
            <XIcon />
          </Link>
        </div>
      </div>
    </ReactModal>
  );
}
