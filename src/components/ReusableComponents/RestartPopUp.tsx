export default function RestartPopUp() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg text-center">
        <h2 className="text-xl font-bold mb-4">Restart Required</h2>
        <p className="mb-4">To apply the changes, please restart the <strong><i>server</i></strong>.</p>
      </div>
    </div>
  );
}