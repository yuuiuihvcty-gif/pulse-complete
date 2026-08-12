import { useEffect, useState } from "react";
import { signedUrl } from "@/lib/media";

export function useSignedUrl(path?: string | null) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    setUrl(null);
    setError(false);
    if (!path) return;
    if (/^https?:\/\//.test(path)) {
      setUrl(path);
      return;
    }
    signedUrl(path)
      .then((u) => active && setUrl(u))
      .catch(() => active && setError(true));
    return () => {
      active = false;
    };
  }, [path]);

  return { url, error };
}
