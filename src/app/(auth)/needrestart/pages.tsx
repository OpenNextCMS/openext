import React from "react";
import RestartPopUp from "@/components/ReusableComponents/RestartPopUp";

const NeedRestartPage: React.FC = () => {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 sm:px-6 lg:px-8">
            <RestartPopUp />
        </div>
    );
};

export default NeedRestartPage;
