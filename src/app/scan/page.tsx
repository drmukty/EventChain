const handleScan = async (data: string) => {
  setBusy(true);
  try {
    const res = await fetch("/api/checkin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        payload: data,
        eventId 
      }),
    });

    const result = await res.json();

    if (res.ok) {
      setScanState({
        status: "success",
        message: result.message,
        attendee: result.attendee,
      });
      toast.success(result.message);
      setTimeout(() => {
        setScanState({ status: "idle" });
        setBusy(false);
        lastPayloadRef.current = null;
      }, 2000);
    } else {
      setScanState({
        status: "error",
        message: result.error || "Scan failed",
      });
      toast.error(result.error || "Scan failed");
      setTimeout(() => {
        setScanState({ status: "idle" });
        setBusy(false);
        lastPayloadRef.current = null;
      }, 2000);
    }
  } catch {
    setScanState({
      status: "error",
      message: "Network error, please try again",
    });
    toast.error("Network error");
    setTimeout(() => {
      setScanState({ status: "idle" });
      setBusy(false);
      lastPayloadRef.current = null;
    }, 2000);
  }
};
