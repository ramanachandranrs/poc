import { useEffect, useState } from "react";

const CountUp = ({ end, duration = 1200 }: { end: number; duration?: number }) => {
  const [val, setVal] = useState(0);

  useEffect(() => {
    let start = 0;
    const startTime = performance.now();
    const step = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setVal(Math.round(eased * end));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [end, duration]);

  return <>{val.toLocaleString()}</>;
};

export default CountUp;
