"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAdmin } from "@/lib/hooks/useAdmin";
import { useAdminConfig } from "@/lib/hooks/useAdminConfig";
import { useAdminPermissions } from "@/lib/hooks/useAdminPermissions";
import { useNotifications } from "@/lib/hooks/useNotifications";
import { useWallet } from "@/lib/context/WalletContext";
import { truncateAddress } from "@/lib/utils/formatters";

export default function AdminPage() {
  const { isConnected, address } = useWallet();
  const {
    isAdmin,
    isController,
    isAdminOrController,
    isLoading: permissionsLoading,
  } = useAdminPermissions();
  const {
    data: config,
    isLoading: configLoading,
    error: configError,
  } = useAdminConfig();
  const admin = useAdmin();
  const notifications = useNotifications();
  const queryClient = useQueryClient();

  // Form states
  const [newAdmin, setNewAdmin] = useState("");
  const [newController, setNewController] = useState("");
  const [newFeeCollector, setNewFeeCollector] = useState("");
  const [permissionless, setPermissionless] = useState(
    config?.permissionless ?? false
  );

  // Loading states
  const [isUpdatingAdmin, setIsUpdatingAdmin] = useState(false);
  const [isUpdatingController, setIsUpdatingController] = useState(false);
  const [isUpdatingFeeCollector, setIsUpdatingFeeCollector] = useState(false);
  const [isUpdatingPermissionless, setIsUpdatingPermissionless] =
    useState(false);
  const [isPausingContract, setIsPausingContract] = useState(false);
  const [isUnpausingContract, setIsUnpausingContract] = useState(false);

  const handleSuccess = (message: string) => {
    notifications.handleSuccess(message);
  };

  const handleError = (error: unknown) => {
    notifications.handleError(error);
  };

  const handleUpdateAdmin = async () => {
    if (!newAdmin.trim()) {
      notifications.handleError("Please enter a valid admin address");
      return;
    }

    setIsUpdatingAdmin(true);
    try {
      await admin.updateAdmin(newAdmin);
      handleSuccess("Admin updated successfully!");
      setNewAdmin("");
      await queryClient.invalidateQueries({ queryKey: ["adminConfig"] });
    } catch (error) {
      handleError(error);
    } finally {
      setIsUpdatingAdmin(false);
    }
  };

  const handleUpdateController = async () => {
    if (!newController.trim()) {
      notifications.handleError("Please enter a valid controller address");
      return;
    }

    setIsUpdatingController(true);
    try {
      await admin.updateController(newController);
      handleSuccess("Controller updated successfully!");
      setNewController("");
      await queryClient.invalidateQueries({ queryKey: ["adminConfig"] });
    } catch (error) {
      handleError(error);
    } finally {
      setIsUpdatingController(false);
    }
  };

  const handleUpdateFeeCollector = async () => {
    if (!newFeeCollector.trim()) {
      notifications.handleError("Please enter a valid fee collector address");
      return;
    }

    setIsUpdatingFeeCollector(true);
    try {
      await admin.updateFeeCollector(newFeeCollector);
      handleSuccess("Fee collector updated successfully!");
      setNewFeeCollector("");
      await queryClient.invalidateQueries({ queryKey: ["adminConfig"] });
    } catch (error) {
      handleError(error);
    } finally {
      setIsUpdatingFeeCollector(false);
    }
  };

  const handleTogglePermissionless = async () => {
    setIsUpdatingPermissionless(true);
    try {
      await admin.setPermissionless(!permissionless);
      setPermissionless(!permissionless);
      handleSuccess(
        `Permissionless mode ${!permissionless ? "enabled" : "disabled"}!`
      );
      await queryClient.invalidateQueries({ queryKey: ["adminConfig"] });
    } catch (error) {
      handleError(error);
    } finally {
      setIsUpdatingPermissionless(false);
    }
  };

  const handlePauseContract = async () => {
    setIsPausingContract(true);
    try {
      await admin.pauseContract();
      handleSuccess("Contract paused successfully!");
      await queryClient.invalidateQueries({ queryKey: ["adminConfig"] });
    } catch (error) {
      handleError(error);
    } finally {
      setIsPausingContract(false);
    }
  };

  const handleUnpauseContract = async () => {
    setIsUnpausingContract(true);
    try {
      await admin.unpauseContract();
      handleSuccess("Contract unpaused successfully!");
      await queryClient.invalidateQueries({ queryKey: ["adminConfig"] });
    } catch (error) {
      handleError(error);
    } finally {
      setIsUnpausingContract(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white p-4">
        <div className="max-w-4xl mx-auto pt-20">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-yellow-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-800">
                  Please connect your wallet to access admin functions.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (permissionsLoading || configLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white p-4">
        <div className="max-w-4xl mx-auto pt-20">
          <div className="flex justify-center items-center min-h-[400px]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        </div>
      </div>
    );
  }

  // Debug logging (remove in production)
  console.log("Admin permissions check:", {
    isAdmin,
    isController,
    isAdminOrController,
    config: config
      ? {
          admin: config.admin,
          controller: config.controller,
          feeCollector: config.feeCollector,
        }
      : null,
    currentAddress: address,
  });

  // Additional safety check - ensure we have config data and address
  if (!config || !address) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white p-4">
        <div className="max-w-4xl mx-auto pt-20">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-yellow-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-800">
                  Loading admin configuration...
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isAdminOrController) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white p-4">
        <div className="max-w-4xl mx-auto pt-20">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-red-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-800">
                  You don&apos;t have admin or controller permissions to access
                  this page.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (configError) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white p-4">
        <div className="max-w-4xl mx-auto pt-20">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-red-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-800">
                  Error loading admin configuration: {configError.message}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white p-4">
      <div className="max-w-6xl mx-auto pt-20">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4 flex items-center">
            <svg
              className="mr-3 h-8 w-8 text-indigo-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
            Admin Dashboard
          </h1>
          <p className="text-gray-600">
            Manage contract settings, permissions, and system configuration.
          </p>
        </div>

        {/* Current Configuration */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center">
              <svg
                className="h-5 w-5 text-gray-400 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              <h2 className="text-lg font-semibold text-gray-900">
                Current Configuration
              </h2>
            </div>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center mb-3">
                  <svg
                    className="h-5 w-5 text-blue-600 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                    />
                  </svg>
                  <h3 className="text-lg font-medium text-gray-900">
                    Admin Address
                  </h3>
                </div>
                <p className="text-sm font-mono text-gray-600">
                  {truncateAddress(config?.admin || "")}
                </p>
                {isAdmin && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mt-2">
                    You
                  </span>
                )}
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center mb-3">
                  <svg
                    className="h-5 w-5 text-purple-600 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                  <h3 className="text-lg font-medium text-gray-900">
                    Controller Address
                  </h3>
                </div>
                <p className="text-sm font-mono text-gray-600">
                  {truncateAddress(config?.controller || "")}
                </p>
                {isController && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 mt-2">
                    You
                  </span>
                )}
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center mb-3">
                  <svg
                    className="h-5 w-5 text-green-600 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                    />
                  </svg>
                  <h3 className="text-lg font-medium text-gray-900">
                    Fee Collector
                  </h3>
                </div>
                <p className="text-sm font-mono text-gray-600">
                  {truncateAddress(config?.feeCollector || "")}
                </p>
                {config?.feeCollector &&
                  address &&
                  config.feeCollector === address && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 mt-2">
                      You
                    </span>
                  )}
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center mb-3">
                  {config?.permissionless ? (
                    <svg
                      className="h-5 w-5 text-green-600 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="h-5 w-5 text-gray-600 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                      />
                    </svg>
                  )}
                  <h3 className="text-lg font-medium text-gray-900">
                    Permissionless Mode
                  </h3>
                </div>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    config?.permissionless
                      ? "bg-green-100 text-green-800"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {config?.permissionless ? "Enabled" : "Disabled"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Contract Status */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center">
              {config?.paused ? (
                <svg
                  className="h-5 w-5 text-red-600 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              ) : (
                <svg
                  className="h-5 w-5 text-green-600 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              )}
              <h2 className="text-lg font-semibold text-gray-900">
                Contract Status
              </h2>
            </div>
          </div>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Contract Status
                </h3>
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                    config?.paused
                      ? "bg-red-100 text-red-800"
                      : "bg-green-100 text-green-800"
                  }`}
                >
                  {config?.paused ? (
                    <>
                      <svg
                        className="h-4 w-4 mr-1"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      Paused
                    </>
                  ) : (
                    <>
                      <svg
                        className="h-4 w-4 mr-1"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      Active
                    </>
                  )}
                </span>
              </div>
              <div className="flex gap-2">
                {config?.paused ? (
                  <button
                    onClick={handleUnpauseContract}
                    disabled={isUnpausingContract}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isUnpausingContract ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    ) : (
                      <svg
                        className="h-4 w-4 mr-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    )}
                    {isUnpausingContract ? "Unpausing..." : "Unpause Contract"}
                  </button>
                ) : (
                  <button
                    onClick={handlePauseContract}
                    disabled={isPausingContract}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isPausingContract ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    ) : (
                      <svg
                        className="h-4 w-4 mr-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    )}
                    {isPausingContract ? "Pausing..." : "Pause Contract"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Admin Functions */}
        {isAdmin && (
          <>
            {/* Update Admin */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">
                  Update Admin
                </h2>
                <p className="text-sm text-gray-600">
                  Transfer admin privileges to another address
                </p>
              </div>
              <div className="p-6">
                <div className="flex gap-4 items-end">
                  <div className="flex-1">
                    <label
                      htmlFor="newAdmin"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      New Admin Address
                    </label>
                    <input
                      type="text"
                      id="newAdmin"
                      value={newAdmin}
                      onChange={(e) => setNewAdmin(e.target.value)}
                      placeholder="0x..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <button
                    onClick={handleUpdateAdmin}
                    disabled={isUpdatingAdmin || !newAdmin.trim()}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isUpdatingAdmin ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    ) : null}
                    {isUpdatingAdmin ? "Updating..." : "Update Admin"}
                  </button>
                </div>
              </div>
            </div>

            {/* Update Controller */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">
                  Update Controller
                </h2>
                <p className="text-sm text-gray-600">
                  Change the controller address
                </p>
              </div>
              <div className="p-6">
                <div className="flex gap-4 items-end">
                  <div className="flex-1">
                    <label
                      htmlFor="newController"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      New Controller Address
                    </label>
                    <input
                      type="text"
                      id="newController"
                      value={newController}
                      onChange={(e) => setNewController(e.target.value)}
                      placeholder="0x..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <button
                    onClick={handleUpdateController}
                    disabled={isUpdatingController || !newController.trim()}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isUpdatingController ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    ) : null}
                    {isUpdatingController ? "Updating..." : "Update Controller"}
                  </button>
                </div>
              </div>
            </div>

            {/* Update Fee Collector */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">
                  Update Fee Collector
                </h2>
                <p className="text-sm text-gray-600">
                  Change the fee collector address
                </p>
              </div>
              <div className="p-6">
                <div className="flex gap-4 items-end">
                  <div className="flex-1">
                    <label
                      htmlFor="newFeeCollector"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      New Fee Collector Address
                    </label>
                    <input
                      type="text"
                      id="newFeeCollector"
                      value={newFeeCollector}
                      onChange={(e) => setNewFeeCollector(e.target.value)}
                      placeholder="0x..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <button
                    onClick={handleUpdateFeeCollector}
                    disabled={isUpdatingFeeCollector || !newFeeCollector.trim()}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isUpdatingFeeCollector ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    ) : null}
                    {isUpdatingFeeCollector
                      ? "Updating..."
                      : "Update Fee Collector"}
                  </button>
                </div>
              </div>
            </div>

            {/* Permissionless Mode */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">
                  Permissionless Mode
                </h2>
                <p className="text-sm text-gray-600">
                  Allow anyone to create raffles or restrict to admin only
                </p>
              </div>
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Permissionless Mode
                    </h3>
                    <p className="text-sm text-gray-600">
                      When enabled, anyone can create raffles. When disabled,
                      only the admin can create raffles.
                    </p>
                  </div>
                  <div className="flex items-center">
                    <button
                      type="button"
                      onClick={handleTogglePermissionless}
                      disabled={isUpdatingPermissionless}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                        permissionless ? "bg-indigo-600" : "bg-gray-200"
                      } ${
                        isUpdatingPermissionless
                          ? "opacity-50 cursor-not-allowed"
                          : ""
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          permissionless ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                    <span className="ml-3 text-sm text-gray-700">
                      {permissionless ? "Enabled" : "Disabled"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Admin Functions Info */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Available Functions
            </h2>
            <p className="text-sm text-gray-600">
              Functions available based on your permissions
            </p>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between py-3">
                <div className="flex items-center">
                  <svg
                    className="h-5 w-5 text-blue-600 mr-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                    />
                  </svg>
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">
                      Admin Functions
                    </h3>
                    <p className="text-sm text-gray-500">
                      Update admin, controller, fee collector, and
                      permissionless mode
                    </p>
                  </div>
                </div>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    isAdmin
                      ? "bg-green-100 text-green-800"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {isAdmin ? "Available" : "Not Available"}
                </span>
              </div>
              <div className="border-t border-gray-200"></div>
              <div className="flex items-center justify-between py-3">
                <div className="flex items-center">
                  <svg
                    className="h-5 w-5 text-red-600 mr-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">
                      Contract Control
                    </h3>
                    <p className="text-sm text-gray-500">
                      Pause and unpause the entire contract
                    </p>
                  </div>
                </div>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    isAdminOrController
                      ? "bg-green-100 text-green-800"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {isAdminOrController ? "Available" : "Not Available"}
                </span>
              </div>
              <div className="border-t border-gray-200"></div>
              <div className="flex items-center justify-between py-3">
                <div className="flex items-center">
                  <svg
                    className="h-5 w-5 text-gray-600 mr-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">
                      Raffle Management
                    </h3>
                    <p className="text-sm text-gray-500">
                      Pause/unpause individual raffles and release raffles
                    </p>
                  </div>
                </div>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    isAdminOrController
                      ? "bg-green-100 text-green-800"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {isAdminOrController ? "Available" : "Not Available"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
