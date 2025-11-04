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
          container: "bg-white dark:bg-[#2d3748] border-l-8 border-l-green-500 dark:border-l-green-400 shadow-2xl dark:shadow-black/30 transition-colors duration-200",
          icon: "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 transition-colors duration-200",
          iconBg: "bg-green-500 dark:bg-green-600",
          title: "text-green-800 dark:text-green-300 font-black transition-colors duration-200",
          message: "text-gray-700 dark:text-gray-300 font-semibold transition-colors duration-200",
        };
      case "error":
        return {
          container: "bg-white dark:bg-[#2d3748] border-l-8 border-l-red-500 dark:border-l-red-400 shadow-2xl dark:shadow-black/30 transition-colors duration-200",
          icon: "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 transition-colors duration-200",
          iconBg: "bg-red-500 dark:bg-red-600",
          title: "text-red-800 dark:text-red-300 font-black transition-colors duration-200",
          message: "text-gray-700 dark:text-gray-300 font-semibold transition-colors duration-200",
        };
      case "info":
        return {
          container: "bg-white dark:bg-[#2d3748] border-l-8 border-l-blue-500 dark:border-l-blue-400 shadow-2xl dark:shadow-black/30 transition-colors duration-200",
          icon: "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 transition-colors duration-200",
          iconBg: "bg-blue-500 dark:bg-blue-600",
          title: "text-blue-800 dark:text-blue-300 font-black transition-colors duration-200",
          message: "text-gray-700 dark:text-gray-300 font-semibold transition-colors duration-200",
        };
      case "warning":
        return {
          container: "bg-white dark:bg-[#2d3748] border-l-8 border-l-yellow-500 dark:border-l-yellow-400 shadow-2xl dark:shadow-black/30 transition-colors duration-200",
          icon: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 transition-colors duration-200",
          iconBg: "bg-yellow-500 dark:bg-yellow-600",
          title: "text-yellow-800 dark:text-yellow-300 font-black transition-colors duration-200",
          message: "text-gray-700 dark:text-gray-300 font-semibold transition-colors duration-200",
        };
      default:
        return {
          container: "bg-white dark:bg-[#2d3748] border-l-8 border-l-gray-500 dark:border-l-gray-400 shadow-2xl dark:shadow-black/30 transition-colors duration-200",
          icon: "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 transition-colors duration-200",
          iconBg: "bg-gray-500 dark:bg-gray-600",
          title: "text-gray-800 dark:text-gray-200 font-black transition-colors duration-200",
          message: "text-gray-700 dark:text-gray-300 font-semibold transition-colors duration-200",
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
                className="flex-shrink-0 ml-6 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors duration-200 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-[#1a202c]"
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
