  useEffect(() => {
    let mounted = true;
    let verificationTimer: ReturnType<typeof setTimeout> | null = null;

    async function checkSession() {
      try {
        const { data } = await supabase.auth.getSession();
        if (!mounted) return;
        if (data.session) {
          await verifyChairman(data.session);
        }
      } finally {
        if (mounted) setAuthLoading(false);
      }
    }
    void checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (!mounted) return;

      if (event === "SIGNED_OUT" || !newSession) {
        setSession(null);
        setAuthorized(false);
        setLoginError("");
        return;
      }

      // Run verification outside Supabase auth callback to avoid deadlock
      verificationTimer = setTimeout(() => {
        if (mounted) {
          void verifyChairman(newSession);
        }
      }, 0);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
      if (verificationTimer) clearTimeout(verificationTimer);
      if (timerRef.current) clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);