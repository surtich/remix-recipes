import ReactModal from "react-modal";

if (typeof window !== "undefined") {
  ReactModal.setAppElement("body"); // un selector válido en css
}

export default function UpdateMealPlan() {
  return <ReactModal isOpen>Update Meal Plan</ReactModal>;
}
