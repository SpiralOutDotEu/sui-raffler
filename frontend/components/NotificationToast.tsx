import React from "react";

interface NotificationToastProps {
  type: "success" | "error" | "info" | "warning";
  title: string;
  message: string;
  onClose?: () => void;
}

export const NotificationToast: React.FC<NotificationToastProps> = ({
  type,
  title,
  message,
  onClose,
}) => {
  const getTypeStyles = () => {
    switch (type) {
      case "success":
        return {
          container: "bg-white border-l-8 border-l-green-500 shadow-2xl",
          icon: "bg-green-100 text-green-600",
          iconBg: "bg-green-500",
          title: "text-green-800 font-black",
          message: "text-gray-700 font-semibold",
        };
      case "error":
        return {
          container: "bg-white border-l-8 border-l-red-500 shadow-2xl",
          icon: "bg-red-100 text-red-600",
          iconBg: "bg-red-500",
          title: "text-red-800 font-black",
          message: "text-gray-700 font-semibold",
        };
      case "info":
        return {
          container: "bg-white border-l-8 border-l-blue-500 shadow-2xl",
          icon: "bg-blue-100 text-blue-600",
          iconBg: "bg-blue-500",
          title: "text-blue-800 font-black",
          message: "text-gray-700 font-semibold",
        };
      case "warning":
        return {
          container: "bg-white border-l-8 border-l-yellow-500 shadow-2xl",
          icon: "bg-yellow-100 text-yellow-600",
          iconBg: "bg-yellow-500",
          title: "text-yellow-800 font-black",
          message: "text-gray-700 font-semibold",
        };
      default:
        return {
          container: "bg-white border-l-8 border-l-gray-500 shadow-2xl",
          icon: "bg-gray-100 text-gray-600",
          iconBg: "bg-gray-500",
          title: "text-gray-800 font-black",
          message: "text-gray-700 font-semibold",
        };
    }
  };

  const getIcon = () => {
    switch (type) {
      case "success":
        return "✓";
      case "error":
        return "✕";
      case "info":
        return "i";
      case "warning":
        return "!";
      default:
        return "ℹ";
    }
  };

  const styles = getTypeStyles();

  return (
    <div
      className={`relative rounded-xl ${styles.container} min-w-[600px] max-w-[800px] shadow-2xl`}
    >
      <div className="flex items-start p-8">
        {/* Icon */}
        <div
          className={`flex-shrink-0 w-16 h-16 rounded-full flex items-center justify-center text-2xl font-black mr-6 ${styles.icon}`}
        >
          {getIcon()}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className={`text-2xl font-black ${styles.title} mb-3`}>
                {title}
              </h3>
              <p
                className={`text-xl font-semibold leading-relaxed ${styles.message}`}
              >
                {message}
              </p>
            </div>

            {/* Close button */}
            {onClose && (
              <button
                onClick={onClose}
                className="flex-shrink-0 ml-6 text-gray-400 hover:text-gray-600 transition-colors p-2 rounded-full hover:bg-gray-100"
              >
                <svg
                  className="w-8 h-8"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={3}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
