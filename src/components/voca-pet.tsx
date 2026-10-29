"use client";

type VocaPetProps = { awake?: boolean; celebrating?: boolean };

export function VocaPet({ awake = false, celebrating = false }: VocaPetProps) {
  return <div className={`voca-character ${awake ? "is-awake" : "is-sleeping"} ${celebrating ? "is-celebrating" : ""}`} role="img" aria-label="Voca 宠物">
    <svg viewBox="0 0 180 180" aria-hidden="true">
      <path className="voca-shadow" d="M44 153c17-9 74-9 92 0 6 4 2 10-8 11H52c-10-1-14-7-8-11Z" />
      <path className="voca-ear" d="M49 65 69 24l25 30-5 36Z" /><path className="voca-ear" d="m131 65-20-41-25 30 5 36Z" />
      <path className="voca-body" d="M40 91c0-38 22-61 50-61s50 23 50 61v37c0 15-18 24-50 24s-50-9-50-24Z" />
      <path className="voca-face" d="M49 88c0-29 17-48 41-48s41 19 41 48v22c0 20-17 31-41 31s-41-11-41-31Z" />
      <path className="voca-mark" d="M76 43c5-8 20-8 27 0l-5 18H81Z" />
      <path className="voca-arm" d="M42 101c-12 7-18 17-14 25 3 6 10 4 17-7Z" /><path className="voca-arm" d="M138 101c12 7 18 17 14 25-3 6-10 4-17-7Z" />
      <path className="voca-foot" d="M51 140v20c0 7 20 7 20 0v-18ZM109 142v18c0 7 20 7 20 0v-20Z" />
      <path className="voca-eye" d="M66 91q7 8 14 0" /><path className="voca-eye" d="M100 91q7 8 14 0" />
      <circle className="voca-cheek" cx="61" cy="108" r="5" /><circle className="voca-cheek" cx="119" cy="108" r="5" />
      <path className="voca-smile" d="M82 108q8 8 16 0" />
    </svg>
    {!awake && <span className="voca-sleep-z">z</span>}
  </div>;
}
