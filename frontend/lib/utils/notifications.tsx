import React from "react";
import { toast, ToastOptions } from "react-hot-toast";
import { NotificationToast } from "../../components/NotificationToast";

const baseOptions: ToastOptions = {
  duration: 10000, // 10 seconds - longer for bigger notifications
  position: "top-center",
  style: {
    background: "transparent",
    boxShadow: "none",
    padding: 0,
  },
};

const getToastContent = (
  type: "success" | "error" | "info" | "warning",
  title: string,
  message: string
) => {
  const toastId = toast.custom(
    (t) => (
      <NotificationToast
        type={type}
        title={title}
        message={message}
        onClose={() => toast.dismiss(t.id)}
      />
    ),
    baseOptions
  );
  return toastId;
};

export const notify = {
  success(message: string) {
    return getToastContent("success", "Success", message);
  },
  error(message: string) {
    return getToastContent("error", "Error", message);
  },
  info(message: string) {
    return getToastContent("info", "Info", message);
  },
  warning(message: string) {
    return getToastContent("warning", "Warning", message);
  },
};
