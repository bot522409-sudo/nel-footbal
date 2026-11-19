import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeftRight,
  CheckCircle2,
  ClipboardCheck,
  Coins,
  LogIn,
  PackageOpen,
  Search,
  Shield,
  Sparkles,
  Tag,
  Trophy,
  Users,
  X,
} from 'lucide-react';
import {
  computeSquadOvr,
  countClaimableMissions,
  ensureFreshMissions,
  FC_MISSIONS,
  FC_PACKS,
  FC_PLAYERS,
  FcClubState,
  FcPackDef,
  FcPlayerCard,
  getMissionProgressValue,
  Language,
} from '../game/fcData';
import {
  OnlineAccountProfile,
  TransferListingRecord,
} from '../services/onlineClubService';
import { FcCardBadge } from './FcCardBadge';

export type FcStoreTab = 'packs' | 'squad' | 'missions' | 'market';

interface FcStoreModalProps {
  club: FcClubState;
  lang: Language;
  isAdmin: boolean;
  account: OnlineAccountProfile | null;
  listings: TransferListingRecord[];
  initialTab: FcStoreTab;
  onClose: () => void;
  onOpenAuth?: () => void;
  onBuyPack: (packId: FcPackDef['id']) => {
    cards: FcPlayerCard[];
    duplicateRefund: number;
  } | null;
  onAssignLineupSlot: (slotIdx: number, cardId: string) => void;
  onAutoBestLineup: () => void;
  onClaimMission: (missionId: string) => void;
  onClaimAllMissions: () => void;
  onCreateListing: (cardId: string, price: number) => Promise<void>;
  onCancelListing: (listingId: string) => Promise<void>;
  onBuyListing: (listingId: string) => Promise<void>;
  onClaimSalePayouts: () => Promise<{
    claimedCount: number;
    totalCoinsReceived: number;
  }>;
}

const SLOT_LABELS_VI = [
  'Thủ Môn (GK)',
  'Hậu Vệ (CB)',
  'Tiền Vệ (CM)',
  'Tiền Đạo Cánh (W)',
  'Trung Phong (ST)',
];

const SLOT_LABELS_EN = [
  'Goalkeeper (GK)',
  'Defender (CB)',
  'Midfielder (CM)',
  'Winger (LW/RW)',
  'Striker (ST)',
];

function suggestListingPrice(ovr: number): number {
  if (ovr >= 180) return 250000;
  if (ovr >= 150) return 100000;
  if (ovr >= 130) return 45000;
  if (ovr >= 105) return 15000;
  if (ovr >= 90) return 5000;
  return 1500;
}

export function FcStoreModal({
  club,
  lang,
  isAdmin,
  account,
  listings,
  initialTab,
  onClose,
  onOpenAuth,
  onBuyPack,
  onAssignLineupSlot,
  onAutoBestLineup,
  onClaimMission,
  onClaimAllMissions,
  onCreateListing,
  onCancelListing,
  onBuyListing,
  onClaimSalePayouts,
}: FcStoreModalProps) {
  const [tab, setTab] = useState<FcStoreTab>(initialTab);
  const [selectedSlot, setSelectedSlot] = useState<number>(4);
  const [packResult, setPackResult] = useState<{
    cards: FcPlayerCard[];
    duplicateRefund: number;
    packName: string;
  } | null>(null);
  const [filterPos, setFilterPos] = useState<
    'ALL' | 'GK' | 'CB' | 'CM' | 'WING' | 'ST'
  >('ALL');

  // Transfer Market State
  const [sellCardId, setSellCardId] = useState<string>('');
  const [sellPriceInput, setSellPriceInput] = useState<string>('5000');
  const [marketSearch, setMarketSearch] = useState<string>('');
  const [marketBusyId, setMarketBusyId] = useState<string | null>(null);
  const [marketFeedback, setMarketFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const isVi = lang === 'vi';
  const squadOvr = computeSquadOvr(club.lineupIds);
  const freshMissions = ensureFreshMissions(club.missions);
  const claimableCount = countClaimableMissions(club);
  const dailyMissions = FC_MISSIONS.filter((m) => m.period === 'daily');
  const weeklyMissions = FC_MISSIONS.filter((m) => m.period === 'weekly');
  const ownedCards = club.ownedIds
    .map((id) => FC_PLAYERS[id])
    .filter(Boolean)
    .sort((a, b) => b.ovr - a.ovr);

  const filteredCards = ownedCards.filter((c) => {
    if (filterPos === 'ALL') return true;
    if (filterPos === 'WING') return c.position === 'LW' || c.position === 'RW';
    return c.position === filterPos;
  });

  const sellableCards = useMemo(
    () => ownedCards.filter((c) => !club.lineupIds.includes(c.id)),
    [ownedCards, club.lineupIds],
  );

  const selectedSellCard = useMemo(() => {
    const found = sellableCards.find((c) => c.id === sellCardId);
    return found ?? sellableCards[0] ?? null;
  }, [sellableCards, sellCardId]);

  const unclaimedSoldListings = useMemo(
    () =>
      listings.filter(
        (l) =>
          account &&
          l.sellerUid === account.uid &&
          l.status === 'sold' &&
          !l.payoutClaimed,
      ),
    [listings, account],
  );

  const unclaimedCoinsTotal = useMemo(
    () => unclaimedSoldListings.reduce((sum, l) => sum + l.price, 0),
    [unclaimedSoldListings],
  );

  const myListings = useMemo(
    () =>
      listings.filter(
        (l) =>
          account &&
          l.sellerUid === account.uid &&
          (l.status === 'active' || (l.status === 'sold' && !l.payoutClaimed)),
      ),
    [listings, account],
  );

  const marketActiveListings = useMemo(() => {
    const q = marketSearch.trim().toLowerCase();
    return listings.filter((l) => {
      if (l.status !== 'active') return false;
      if (account && l.sellerUid === account.uid) return false;
      if (!q) return true;
      return (
        l.cardName.toLowerCase().includes(q) ||
        l.sellerName.toLowerCase().includes(q) ||
        l.cardPosition.toLowerCase().includes(q)
      );
    });
  }, [listings, account, marketSearch]);

  const handleOpenPack = (pack: FcPackDef) => {
    const res = onBuyPack(pack.id);
    if (!res) return;
    setPackResult({
      cards: res.cards,
      duplicateRefund: res.duplicateRefund,
      packName: lang === 'vi' ? pack.nameVi : pack.nameEn,
    });
  };

  const handlePickSellCard = (card: FcPlayerCard) => {
    setSellCardId(card.id);
    setSellPriceInput(String(suggestListingPrice(card.ovr)));
  };

  const handleSubmitListing = async () => {
    if (!selectedSellCard) return;
    const raw = Number(sellPriceInput.replace(/[^0-9]/g, ''));
    if (!Number.isFinite(raw) || raw < 100) {
      setMarketFeedback({
        type: 'error',
        text: isVi
          ? 'Giá rao bán tối thiểu là 100 Xu.'
          : 'Minimum listing price is 100 Coins.',
      });
      return;
    }
    setMarketBusyId('create');
    setMarketFeedback(null);
    try {
      await onCreateListing(selectedSellCard.id, raw);
      setMarketFeedback({
        type: 'success',
        text: isVi
          ? `Đã rao bán ${selectedSellCard.shortName} (${selectedSellCard.ovr} OVR) với giá ${Math.round(raw).toLocaleString()} Xu!`
          : `Listed ${selectedSellCard.shortName} (${selectedSellCard.ovr} OVR) for ${Math.round(raw).toLocaleString()} Coins!`,
      });
      setSellCardId('');
    } catch (err) {
      setMarketFeedback({
        type: 'error',
        text:
          err instanceof Error
            ? err.message
            : isVi
            ? 'Không thể đăng bán cầu thủ.'
            : 'Failed to create listing.',
      });
    } finally {
      setMarketBusyId(null);
    }
  };

  const handleCancelMyListing = async (listing: TransferListingRecord) => {
    setMarketBusyId(listing.listingId);
    setMarketFeedback(null);
    try {
      await onCancelListing(listing.listingId);
      setMarketFeedback({
        type: 'success',
        text: isVi
          ? `Đã thu hồi thẻ ${listing.cardName} về kho cầu thủ.`
          : `Cancelled listing and returned ${listing.cardName} to your club.`,
      });
    } catch (err) {
      setMarketFeedback({
        type: 'error',
        text:
          err instanceof Error
            ? err.message
            : isVi
            ? 'Không thể hủy rao bán.'
            : 'Failed to cancel listing.',
      });
    } finally {
      setMarketBusyId(null);
    }
  };

  const handleBuyMarketListing = async (listing: TransferListingRecord) => {
    setMarketBusyId(listing.listingId);
    setMarketFeedback(null);
    try {
      await onBuyListing(listing.listingId);
      setMarketFeedback({
        type: 'success',
        text: isVi
          ? `Mua thành công ${listing.cardName} (${listing.cardOvr} OVR) từ @${listing.sellerName}! Thẻ đã vào kho Đội Hình.`
          : `Bought ${listing.cardName} (${listing.cardOvr} OVR) from @${listing.sellerName}!`,
      });
    } catch (err) {
      setMarketFeedback({
        type: 'error',
        text:
          err instanceof Error
            ? err.message
            : isVi
            ? 'Mua cầu thủ thất bại.'
            : 'Purchase failed.',
      });
    } finally {
      setMarketBusyId(null);
    }
  };

  const handleClaimPayouts = async () => {
    setMarketBusyId('claim');
    setMarketFeedback(null);
    try {
      const res = await onClaimSalePayouts();
      if (res.claimedCount > 0) {
        setMarketFeedback({
          type: 'success',
          text: isVi
            ? isAdmin
              ? `Đã xác nhận bán thành công ${res.claimedCount} cầu thủ (Tài khoản Admin có ∞ Xu).`
              : `Đã nhận +${res.totalCoinsReceived.toLocaleString()} Xu từ ${res.claimedCount} cầu thủ đã bán!`
            : `Claimed +${res.totalCoinsReceived.toLocaleString()} Coins from ${res.claimedCount} sold player(s)!`,
        });
      }
    } catch (err) {
      setMarketFeedback({
        type: 'error',
        text:
          err instanceof Error
            ? err.message
            : isVi
            ? 'Nhận tiền bán cầu thủ thất bại.'
            : 'Failed to claim sale coins.',
      });
    } finally {
      setMarketBusyId(null);
    }
  };

  const slotLabels = lang === 'vi' ? SLOT_LABELS_VI : SLOT_LABELS_EN;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#060b14]/85 p-3 sm:p-5 overflow-y-auto">
      <div className="w-full max-w-5xl max-h-[92vh] overflow-y-auto bg-[#0B1320] border border-white/15 rounded-2xl p-5 sm:p-6 shadow-2xl my-auto">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-white/10">
          <div>
            <p className="text-xs font-semibold text-amber-400">
              {lang === 'vi'
                ? 'Câu Lạc Bộ FC · Mở Pack · Khu Trao Đổi · Nhiệm Vụ · Đội Hình'
                : 'FC Club · Packs · Transfer Market · Missions · Squad'}
            </p>
            <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-white tracking-wide mt-0.5">
              {tab === 'packs'
                ? lang === 'vi'
                  ? 'CỬA HÀNG MỞ PACK'
                  : 'FC PACK STORE'
                : tab === 'market'
                ? lang === 'vi'
                  ? 'KHU TRAO ĐỔI & MUA BÁN CẦU THỦ'
                  : 'PLAYER TRANSFER MARKET'
                : tab === 'missions'
                ? lang === 'vi'
                  ? 'NHIỆM VỤ HẰNG NGÀY & HẰNG TUẦN'
                  : 'DAILY & WEEKLY MISSIONS'
                : lang === 'vi'
                ? 'ĐỘI HÌNH & THẺ CẦU THỦ'
                : 'SQUAD & PLAYER CARDS'}
            </h2>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-400/15 border border-amber-400/40 text-amber-300 font-mono-tabular text-sm font-bold">
              <Coins size={16} />
              <span>{isAdmin ? '∞ Xu' : `${club.coins.toLocaleString()} Xu`}</span>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-500/15 border border-emerald-400/40 text-emerald-300 font-mono-tabular text-sm font-bold">
              <Shield size={16} />
              <span>OVR {squadOvr}</span>
            </div>

            <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-white/10 flex-wrap">
              <button
                type="button"
                onClick={() => setTab('packs')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
                  tab === 'packs'
                    ? 'bg-amber-400 text-slate-950'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <PackageOpen size={14} />
                <span>{lang === 'vi' ? 'Mua Pack' : 'Packs'}</span>
              </button>
              <button
                type="button"
                onClick={() => setTab('market')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
                  tab === 'market'
                    ? 'bg-violet-400 text-slate-950'
                    : unclaimedCoinsTotal > 0
                    ? 'bg-violet-500/20 text-violet-200 hover:text-white'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <ArrowLeftRight size={14} />
                <span>
                  {lang === 'vi'
                    ? unclaimedSoldListings.length > 0
                      ? `Trao Đổi (+${unclaimedSoldListings.length})`
                      : 'Khu Trao Đổi'
                    : unclaimedSoldListings.length > 0
                    ? `Market (+${unclaimedSoldListings.length})`
                    : 'Market'}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setTab('missions')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
                  tab === 'missions'
                    ? 'bg-sky-400 text-slate-950'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <ClipboardCheck size={14} />
                <span>
                  {lang === 'vi'
                    ? claimableCount > 0
                      ? `Nhiệm Vụ (${claimableCount})`
                      : 'Nhiệm Vụ'
                    : claimableCount > 0
                    ? `Missions (${claimableCount})`
                    : 'Missions'}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setTab('squad')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
                  tab === 'squad'
                    ? 'bg-emerald-500 text-slate-950'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Users size={14} />
                <span>
                  {lang === 'vi'
                    ? `Đội Hình (${ownedCards.length})`
                    : `Squad (${ownedCards.length})`}
                </span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng"
              className="flex items-center justify-center w-9 h-9 rounded-lg bg-slate-900 hover:bg-slate-800 border border-white/10 text-slate-300 hover:text-white cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Pack Walkout Reveal Banner */}
        {packResult ? (
          <div className="mt-4 p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-amber-500/18 via-slate-900 to-sky-500/15 border-2 border-amber-400/60">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2 text-amber-300">
                <Sparkles size={20} />
                <span className="font-display text-xl font-extrabold tracking-wide">
                  {lang === 'vi'
                    ? `MỞ THÀNH CÔNG: ${packResult.packName.toUpperCase()}!`
                    : `PACK OPENED: ${packResult.packName.toUpperCase()}!`}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setPackResult(null)}
                className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white cursor-pointer"
              >
                {lang === 'vi' ? 'Đóng thông báo' : 'Dismiss'}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {packResult.cards.map((c, idx) => (
                <FcCardBadge
                  key={`${c.id}-${idx}`}
                  card={c}
                  lang={lang}
                  equippedLabel={
                    lang === 'vi' ? 'Đã thêm vào Câu Lạc Bộ' : 'Added to Club'
                  }
                />
              ))}
            </div>

            {packResult.duplicateRefund > 0 ? (
              <p className="text-xs font-semibold text-amber-300 mt-3">
                {lang === 'vi'
                  ? `Cầu thủ trùng thẻ đã được quy đổi tự động thành +${packResult.duplicateRefund.toLocaleString()} Xu thưởng!`
                  : `Duplicate card automatically converted to +${packResult.duplicateRefund.toLocaleString()} bonus Coins!`}
              </p>
            ) : null}
          </div>
        ) : null}

        {tab === 'packs' ? (
          /* PACK STORE TAB */
          <div className="py-5 space-y-5">
            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-white/10 text-xs text-slate-300 flex flex-wrap items-center justify-between gap-3">
              <p>
                {lang === 'vi'
                  ? 'Ghi bàn (+100 Xu), thắng trận & làm Nhiệm Vụ để săn thẻ 130+ (tỉ lệ tối đa 5%, càng hiếm tỉ lệ càng thấp) lên tới OVR 150!'
                  : 'Earn Coins from goals (+100), wins & Missions to hunt rare 130+ cards (max 5% odds, rarer = lower %) up to 150 OVR!'}
              </p>
              <div className="flex items-center gap-3">
                <span className="font-mono-tabular text-amber-300 font-semibold">
                  {lang === 'vi'
                    ? `Đã mở: ${club.packsOpened} Pack · Mục tiêu: OVR ${squadOvr}/${
                        isAdmin || squadOvr > 150 ? 200 : 150
                      }`
                    : `Opened: ${club.packsOpened} Packs · Goal: OVR ${squadOvr}/${
                        isAdmin || squadOvr > 150 ? 200 : 150
                      }`}
                </span>
                {claimableCount > 0 ? (
                  <button
                    type="button"
                    onClick={() => setTab('missions')}
                    className="px-3 py-1.5 rounded-lg bg-sky-400 hover:bg-sky-300 text-slate-950 font-extrabold text-xs whitespace-nowrap cursor-pointer"
                  >
                    {lang === 'vi'
                      ? `Nhận ${claimableCount} Nhiệm Vụ`
                      : `Claim ${claimableCount} Missions`}
                  </button>
                ) : null}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
              {FC_PACKS.map((pack) => {
                const canAfford = isAdmin || club.coins >= pack.price;
                const isSupremePack =
                  Boolean(pack.adminOnly) || pack.id === 'admin_200_pack';
                const isTopMythic =
                  pack.id === 'divine_150_pack' || pack.id === 'goat_pack';
                return (
                  <div
                    key={pack.id}
                    className={`flex flex-col justify-between p-4 rounded-2xl border shadow-lg ${
                      isSupremePack
                        ? 'bg-gradient-to-br from-[#3b0a18] via-[#1b1024] to-[#0b1320] border-amber-300/80'
                        : pack.id === 'divine_150_pack'
                        ? 'bg-slate-900/90 border-fuchsia-400/65'
                        : isTopMythic
                        ? 'bg-slate-900/90 border-amber-400/50'
                        : 'bg-slate-900/90 border-white/15'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className="px-2 py-0.5 rounded text-[11px] font-extrabold text-slate-950"
                            style={{ backgroundColor: pack.accentColor }}
                          >
                            {pack.badgeText}
                          </span>
                          {isSupremePack ? (
                            <span className="px-1.5 py-0.5 rounded bg-amber-300 text-slate-950 text-[10px] font-extrabold">
                              {lang === 'vi' ? 'SIÊU CẤP 200' : 'OVR 200'}
                            </span>
                          ) : null}
                        </div>
                        <span className="text-xs font-mono-tabular text-slate-400 shrink-0">
                          {pack.cardsCount}{' '}
                          {lang === 'vi' ? 'Thẻ Cầu Thủ' : 'Cards'}
                        </span>
                      </div>

                      <h3 className="font-display text-xl font-extrabold text-white mt-3 leading-tight">
                        {lang === 'vi' ? pack.nameVi : pack.nameEn}
                      </h3>
                      <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                        {lang === 'vi' ? pack.descVi : pack.descEn}
                      </p>

                      {/* Transparent Drop Rates */}
                      <div className="mt-2.5 pt-2 border-t border-white/10 space-y-1">
                        {pack.tierOdds.map((t) => (
                          <div
                            key={`${pack.id}-${t.minOvr}-${t.maxOvr}`}
                            className={`flex items-center justify-between text-[11px] font-mono-tabular ${
                              t.isRare130Plus
                                ? 'text-amber-300 font-bold'
                                : 'text-slate-400'
                            }`}
                          >
                            <span>{lang === 'vi' ? t.labelVi : t.labelEn}</span>
                            <span>{t.chancePct}%</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-white/10">
                      <button
                        type="button"
                        disabled={!canAfford}
                        onClick={() => handleOpenPack(pack)}
                        className={`w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-extrabold transition-colors cursor-pointer ${
                          canAfford
                            ? isSupremePack
                              ? 'bg-gradient-to-r from-amber-300 to-rose-400 hover:brightness-110 text-slate-950'
                              : 'bg-amber-400 hover:bg-amber-300 text-slate-950'
                            : 'bg-slate-800 text-slate-400 cursor-not-allowed'
                        }`}
                      >
                        <Coins size={15} />
                        <span className="truncate">
                          {isAdmin
                            ? isSupremePack
                              ? lang === 'vi'
                                ? 'Mở Pack · MIỄN PHÍ (Admin)'
                                : 'Open · FREE (Admin)'
                              : lang === 'vi'
                              ? 'Mở Pack · ∞ (Admin)'
                              : 'Open · ∞ (Admin)'
                            : canAfford
                            ? `${lang === 'vi' ? 'Mở Pack' : 'Open'} · ${pack.price.toLocaleString()} Xu`
                            : `${lang === 'vi' ? 'Cần' : 'Need'} ${pack.price.toLocaleString()} Xu`}
                        </span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : tab === 'market' ? (
          /* PLAYER TRANSFER MARKET TAB (KHU TRAO ĐỔI) */
          <div className="py-5 space-y-5">
            {!account ? (
              <div className="p-6 rounded-2xl bg-slate-900/90 border border-violet-400/40 text-center space-y-3">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-violet-400/20 text-violet-300">
                  <ArrowLeftRight size={24} />
                </div>
                <h3 className="font-display text-xl font-extrabold text-white">
                  {isVi
                    ? 'ĐĂNG NHẬP ĐỂ VÀO KHU TRAO ĐỔI CẦU THỦ'
                    : 'SIGN IN TO ACCESS THE TRANSFER MARKET'}
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 max-w-lg mx-auto leading-relaxed">
                  {isVi
                    ? 'Khu Trao Đổi đồng bộ thời gian thực giữa tất cả người chơi trên Cloud. Hãy đăng nhập hoặc tạo tài khoản để rao bán thẻ dư, mua siêu sao từ người chơi khác và nhận Xu bán thẻ an toàn!'
                    : 'The Transfer Market syncs live across players on the cloud. Sign in or create an account to list spare cards, buy stars from other players, and claim Coins safely!'}
                </p>
                {onOpenAuth ? (
                  <button
                    type="button"
                    onClick={onOpenAuth}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-400 hover:bg-violet-300 text-slate-950 font-extrabold text-xs sm:text-sm cursor-pointer"
                  >
                    <LogIn size={16} />
                    <span>
                      {isVi
                        ? 'Đăng Nhập / Tạo Tài Khoản Ngay'
                        : 'Log In / Sign Up Now'}
                    </span>
                  </button>
                ) : null}
              </div>
            ) : (
              <>
                {/* Pending Sale Payout Banner */}
                {unclaimedSoldListings.length > 0 ? (
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/20 via-amber-500/15 to-emerald-500/15 border-2 border-emerald-400/65 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 text-emerald-300 font-extrabold text-sm">
                        <Coins size={18} />
                        <span>
                          {isVi
                            ? `Chúc mừng! ${unclaimedSoldListings.length} cầu thủ bạn rao bán đã có người mua!`
                            : `${unclaimedSoldListings.length} of your listed player(s) have been sold!`}
                        </span>
                      </div>
                      <p className="text-xs text-slate-200 mt-1">
                        {isVi
                          ? isAdmin
                            ? `Tổng giá trị giao dịch: ${unclaimedCoinsTotal.toLocaleString()} Xu (Tài khoản Admin luôn có ∞ Xu).`
                            : `Bấm "Nhận Tiền Bán" để cộng ngay +${unclaimedCoinsTotal.toLocaleString()} Xu vào tài khoản của bạn.`
                          : `Claim +${unclaimedCoinsTotal.toLocaleString()} Coins into your club balance now.`}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={marketBusyId === 'claim'}
                      onClick={() => void handleClaimPayouts()}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-extrabold text-xs sm:text-sm cursor-pointer disabled:opacity-50"
                    >
                      <Coins size={16} />
                      <span>
                        {isVi
                          ? `Nhận Tiền Bán (+${unclaimedCoinsTotal.toLocaleString()} Xu)`
                          : `Claim (+${unclaimedCoinsTotal.toLocaleString()} Coins)`}
                      </span>
                    </button>
                  </div>
                ) : null}

                {marketFeedback ? (
                  <div
                    className={`flex items-center gap-2 p-3 rounded-xl border text-xs font-semibold ${
                      marketFeedback.type === 'success'
                        ? 'bg-emerald-500/15 border-emerald-400/45 text-emerald-200'
                        : 'bg-rose-500/15 border-rose-400/45 text-rose-200'
                    }`}
                  >
                    {marketFeedback.type === 'success' ? (
                      <CheckCircle2 size={15} className="shrink-0 text-emerald-300" />
                    ) : (
                      <AlertTriangle size={15} className="shrink-0 text-rose-300" />
                    )}
                    <span>{marketFeedback.text}</span>
                  </div>
                ) : null}

                {/* Sell Card Form */}
                <div className="p-4 rounded-2xl bg-slate-900/85 border border-white/12 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-violet-300 font-extrabold text-sm">
                      <Tag size={16} />
                      <span>
                        {isVi
                          ? 'Rao Bán Cầu Thủ Trong Kho (Nhận 100% Tiền Bán)'
                          : 'List a Spare Club Player for Sale (100% Sale Payout)'}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400">
                      {isVi
                        ? 'Chỉ bán được cầu thủ dự bị (không nằm trong 5 vị trí ra sân)'
                        : 'Only reserve cards not in active 5v5 XI can be listed'}
                    </span>
                  </div>

                  {club.ownedIds.length <= 5 || sellableCards.length === 0 ? (
                    <div className="p-3 rounded-xl bg-slate-950/70 border border-white/10 text-xs text-slate-300">
                      {isVi
                        ? 'Bạn chưa có thẻ cầu thủ dự bị để rao bán (CLB cần giữ tối thiểu 5 cầu thủ trong đội hình ra sân). Hãy mở thêm Pack để có thêm thẻ!'
                        : 'No spare reserve cards available to sell (minimum 5 cards required for your lineup). Open more Packs first!'}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                      {/* Card selector */}
                      <div className="lg:col-span-7 space-y-2">
                        <div className="text-[11px] font-bold text-slate-300">
                          {isVi
                            ? `1. Chọn thẻ muốn rao bán (${sellableCards.length} thẻ dự bị khả dụng):`
                            : `1. Pick card to sell (${sellableCards.length} reserve cards):`}
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-56 overflow-y-auto pr-1">
                          {sellableCards.map((c) => {
                            const isPicked = selectedSellCard?.id === c.id;
                            return (
                              <button
                                key={`sell-${c.id}`}
                                type="button"
                                onClick={() => handlePickSellCard(c)}
                                className={`p-2 rounded-xl border text-left transition-colors cursor-pointer ${
                                  isPicked
                                    ? 'bg-violet-500/25 border-violet-300 text-white'
                                    : 'bg-slate-950/75 border-white/10 text-slate-200 hover:border-white/25'
                                }`}
                              >
                                <div className="flex items-center justify-between gap-1">
                                  <span className="font-display text-lg font-extrabold text-amber-300 leading-none">
                                    {c.ovr}
                                  </span>
                                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-200">
                                    {c.position}
                                  </span>
                                </div>
                                <div className="text-xs font-bold truncate mt-1">
                                  {c.shortName}
                                </div>
                                <div className="text-[10px] text-slate-400 truncate">
                                  {c.rarity.toUpperCase()} · {c.club}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Price & Submit */}
                      <div className="lg:col-span-5 p-3.5 rounded-xl bg-slate-950/80 border border-white/10 space-y-3">
                        {selectedSellCard ? (
                          <div className="flex items-center justify-between gap-2 pb-2 border-b border-white/10">
                            <div>
                              <div className="text-xs text-slate-400">
                                {isVi ? 'Đang chọn bán:' : 'Selected Card:'}
                              </div>
                              <div className="text-sm font-extrabold text-white">
                                {selectedSellCard.name} ({selectedSellCard.ovr} OVR)
                              </div>
                            </div>
                            <span className="px-2 py-0.5 rounded bg-violet-500/20 border border-violet-400/40 text-violet-200 text-[11px] font-bold">
                              {selectedSellCard.position}
                            </span>
                          </div>
                        ) : null}

                        <div>
                          <label className="block text-[11px] font-bold text-slate-300 mb-1">
                            {isVi
                              ? '2. Đặt giá rao bán (tối thiểu 100 Xu):'
                              : '2. Listing price (min 100 Coins):'}
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              inputMode="numeric"
                              value={sellPriceInput}
                              onChange={(e) => setSellPriceInput(e.target.value)}
                              className="flex-1 px-3 py-2 rounded-lg bg-slate-900 border border-white/15 text-sm font-mono-tabular text-amber-300 font-bold focus:outline-none focus:border-violet-400"
                            />
                            <span className="text-xs font-bold text-amber-300">Xu</span>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {[
                              1000,
                              5000,
                              25000,
                              100000,
                              500000,
                              1_000_000,
                              10_000_000,
                              60_000_000,
                            ].map((preset) => (
                              <button
                                key={preset}
                                type="button"
                                onClick={() => setSellPriceInput(String(preset))}
                                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] font-mono-tabular font-bold text-slate-200 cursor-pointer"
                              >
                                {preset.toLocaleString()}
                              </button>
                            ))}
                          </div>
                        </div>

                        <button
                          type="button"
                          disabled={!selectedSellCard || marketBusyId === 'create'}
                          onClick={() => void handleSubmitListing()}
                          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-violet-400 hover:bg-violet-300 text-slate-950 font-extrabold text-xs sm:text-sm cursor-pointer disabled:opacity-50"
                        >
                          <Tag size={15} />
                          <span>
                            {marketBusyId === 'create'
                              ? isVi
                                ? 'Đang đăng bán...'
                                : 'Listing...'
                              : isVi
                              ? 'Đăng Bán Lên Khu Trao Đổi'
                              : 'Post Card to Market'}
                          </span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* My Active / Unclaimed Listings */}
                {myListings.length > 0 ? (
                  <div className="space-y-2.5">
                    <h3 className="text-xs font-extrabold text-amber-300 tracking-wide">
                      {isVi
                        ? `THẺ BẠN ĐANG RAO BÁN / CHỜ NHẬN TIỀN (${myListings.length})`
                        : `YOUR ACTIVE & UNCLAIMED LISTINGS (${myListings.length})`}
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {myListings.map((listing) => {
                        const card = FC_PLAYERS[listing.cardId];
                        if (!card) return null;
                        const isSold = listing.status === 'sold';
                        return (
                          <div
                            key={listing.listingId}
                            className="p-3 rounded-xl bg-slate-900/90 border border-white/15 space-y-2.5"
                          >
                            <FcCardBadge card={card} lang={lang} compact />
                            <div className="flex items-center justify-between gap-2 text-xs">
                              <span className="font-mono-tabular font-extrabold text-amber-300">
                                {listing.price.toLocaleString()} Xu
                              </span>
                              {isSold ? (
                                <span className="px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-400/45 text-emerald-300 font-bold text-[11px]">
                                  {isVi
                                    ? `Đã bán cho @${listing.buyerName || 'Player'}`
                                    : `Sold to @${listing.buyerName || 'Player'}`}
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  disabled={marketBusyId === listing.listingId}
                                  onClick={() => void handleCancelMyListing(listing)}
                                  className="px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/35 border border-rose-400/45 text-rose-200 font-bold text-xs cursor-pointer disabled:opacity-50"
                                >
                                  {isVi ? 'Hủy & Thu Hồi' : 'Cancel'}
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : null}

                {/* Global Active Market Listings */}
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="text-xs font-extrabold text-emerald-300 tracking-wide">
                      {isVi
                        ? `SÀN TRAO ĐỔI CẦU THỦ ĐANG BÁN (${marketActiveListings.length})`
                        : `PLAYERS AVAILABLE ON TRANSFER MARKET (${marketActiveListings.length})`}
                    </h3>
                    <div className="relative min-w-[200px] max-w-xs w-full sm:w-auto">
                      <Search
                        size={14}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                      />
                      <input
                        type="text"
                        value={marketSearch}
                        onChange={(e) => setMarketSearch(e.target.value)}
                        placeholder={
                          isVi
                            ? 'Tìm tên cầu thủ hoặc người bán...'
                            : 'Search player or seller...'
                        }
                        className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-950 border border-white/15 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-400"
                      />
                    </div>
                  </div>

                  {marketActiveListings.length === 0 ? (
                    <div className="py-10 px-4 rounded-2xl bg-slate-900/60 border border-white/10 text-center text-xs sm:text-sm text-slate-400">
                      {isVi
                        ? 'Hiện chưa có thẻ nào từ người chơi khác đang rao bán. Hãy thử đăng bán thẻ dư của bạn hoặc quay lại sau!'
                        : 'No player cards from other managers listed right now. List one of your spare cards or check back soon!'}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {marketActiveListings.map((listing) => {
                        const card = FC_PLAYERS[listing.cardId];
                        if (!card) return null;
                        const alreadyOwned = club.ownedIds.includes(listing.cardId);
                        const canAfford = isAdmin || club.coins >= listing.price;
                        const disabled =
                          alreadyOwned ||
                          !canAfford ||
                          marketBusyId === listing.listingId;

                        return (
                          <div
                            key={listing.listingId}
                            className="p-3 rounded-xl bg-slate-900/90 border border-white/15 flex flex-col justify-between gap-2.5"
                          >
                            <FcCardBadge card={card} lang={lang} compact />
                            <div className="flex items-center justify-between gap-2 text-[11px] text-slate-300">
                              <span>
                                {isVi ? 'Người bán:' : 'Seller:'}{' '}
                                <strong className="text-white">
                                  @{listing.sellerName}
                                </strong>
                              </span>
                              <span className="font-mono-tabular font-extrabold text-amber-300 text-xs">
                                {listing.price.toLocaleString()} Xu
                              </span>
                            </div>
                            <button
                              type="button"
                              disabled={disabled}
                              onClick={() => void handleBuyMarketListing(listing)}
                              className={`w-full py-2 px-3 rounded-lg text-xs font-extrabold transition-colors ${
                                alreadyOwned
                                  ? 'bg-slate-800 text-slate-400 cursor-not-allowed'
                                  : canAfford
                                  ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 cursor-pointer'
                                  : 'bg-slate-800 text-rose-300 cursor-not-allowed'
                              }`}
                            >
                              {marketBusyId === listing.listingId
                                ? isVi
                                  ? 'Đang giao dịch...'
                                  : 'Buying...'
                                : alreadyOwned
                                ? isVi
                                  ? 'Bạn đã sở hữu thẻ này'
                                  : 'Already Owned'
                                : !canAfford
                                ? isVi
                                  ? `Thiếu Xu (${listing.price.toLocaleString()})`
                                  : `Need ${listing.price.toLocaleString()}`
                                : isAdmin
                                ? isVi
                                  ? 'Mua Ngay (Admin ∞)'
                                  : 'Buy Now (Admin ∞)'
                                : isVi
                                ? `Mua Ngay · ${listing.price.toLocaleString()} Xu`
                                : `Buy · ${listing.price.toLocaleString()}`}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        ) : tab === 'missions' ? (
          /* DAILY & WEEKLY MISSIONS TAB */
          <div className="py-5 space-y-6">
            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-white/10 text-xs text-slate-300 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-slate-200 font-semibold">
                  {lang === 'vi'
                    ? 'Hoàn thành nhiệm vụ khi thi đấu (Đấu 3D, Đấu Bot, Penalty, Thử Thách, Tập Sút & Làm GK) để nhận Xu thưởng!'
                    : 'Complete missions across 3D Match, Vs Bot, Penalty, Challenge, Practice & GK modes to earn big Coin rewards!'}
                </p>
                <p className="font-mono-tabular text-slate-400 mt-0.5">
                  {lang === 'vi'
                    ? `Hằng ngày: ${freshMissions.dailyDate} · Tuần: ${freshMissions.weeklyKey}`
                    : `Daily: ${freshMissions.dailyDate} · Weekly: ${freshMissions.weeklyKey}`}
                </p>
              </div>

              {claimableCount > 0 ? (
                <button
                  type="button"
                  onClick={onClaimAllMissions}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs whitespace-nowrap cursor-pointer"
                >
                  <Coins size={15} />
                  <span>
                    {lang === 'vi'
                      ? `Nhận Tất Cả (${claimableCount})`
                      : `Claim All (${claimableCount})`}
                  </span>
                </button>
              ) : null}
            </div>

            {/* Daily Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-lg font-extrabold text-sky-300 tracking-wide">
                  {lang === 'vi' ? 'NHIỆM VỤ HẰNG NGÀY' : 'DAILY MISSIONS'}
                </h3>
                <span className="text-xs font-mono-tabular text-slate-400">
                  {lang === 'vi' ? 'Làm mới mỗi ngày' : 'Resets daily'}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {dailyMissions.map((m) => {
                  const { progress, claimed, claimable } =
                    getMissionProgressValue(freshMissions, m);
                  const pct = Math.min(100, Math.round((progress / m.target) * 100));
                  return (
                    <div
                      key={m.id}
                      className={`flex flex-col justify-between p-4 rounded-xl border ${
                        claimable
                          ? 'bg-sky-500/12 border-sky-400/60'
                          : claimed
                          ? 'bg-slate-900/50 border-white/10 opacity-75'
                          : 'bg-slate-900/85 border-white/12'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h4 className="text-sm font-bold text-white">
                            {lang === 'vi' ? m.titleVi : m.titleEn}
                          </h4>
                          <p className="text-xs text-slate-300 mt-0.5">
                            {lang === 'vi' ? m.descVi : m.descEn}
                          </p>
                        </div>
                        <span className="font-mono-tabular text-xs font-extrabold text-amber-300 whitespace-nowrap shrink-0">
                          +{m.rewardCoins.toLocaleString()} Xu
                        </span>
                      </div>

                      <div className="mt-3 flex items-center gap-3">
                        <div className="flex-1">
                          <div className="flex items-center justify-between text-[11px] font-mono-tabular text-slate-300 mb-1">
                            <span>
                              {progress} / {m.target}
                            </span>
                            <span>{pct}%</span>
                          </div>
                          <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                            <div
                              className={`h-full transition-all ${
                                claimed || claimable
                                  ? 'bg-emerald-400'
                                  : 'bg-sky-400'
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>

                        <button
                          type="button"
                          disabled={!claimable}
                          onClick={() => onClaimMission(m.id)}
                          className={`px-3.5 py-2 rounded-lg text-xs font-extrabold whitespace-nowrap shrink-0 transition-colors ${
                            claimed
                              ? 'bg-slate-800 text-emerald-400 cursor-default'
                              : claimable
                              ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 cursor-pointer'
                              : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                          }`}
                        >
                          {claimed
                            ? lang === 'vi'
                              ? 'Đã Nhận'
                              : 'Claimed'
                            : claimable
                            ? lang === 'vi'
                              ? 'Nhận Xu'
                              : 'Claim'
                            : lang === 'vi'
                            ? 'Đang Làm'
                            : 'In Progress'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Weekly Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-amber-300">
                  <Trophy size={18} />
                  <h3 className="font-display text-lg font-extrabold tracking-wide">
                    {lang === 'vi' ? 'NHIỆM VỤ HẰNG TUẦN' : 'WEEKLY MISSIONS'}
                  </h3>
                </div>
                <span className="text-xs font-mono-tabular text-slate-400">
                  {lang === 'vi' ? 'Thưởng lớn mỗi tuần' : 'Resets weekly'}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {weeklyMissions.map((m) => {
                  const { progress, claimed, claimable } =
                    getMissionProgressValue(freshMissions, m);
                  const pct = Math.min(100, Math.round((progress / m.target) * 100));
                  return (
                    <div
                      key={m.id}
                      className={`flex flex-col justify-between p-4 rounded-xl border ${
                        claimable
                          ? 'bg-amber-500/14 border-amber-400/65'
                          : claimed
                          ? 'bg-slate-900/50 border-white/10 opacity-75'
                          : 'bg-slate-900/85 border-white/12'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h4 className="text-sm font-bold text-white">
                            {lang === 'vi' ? m.titleVi : m.titleEn}
                          </h4>
                          <p className="text-xs text-slate-300 mt-0.5">
                            {lang === 'vi' ? m.descVi : m.descEn}
                          </p>
                        </div>
                        <span className="font-mono-tabular text-xs font-extrabold text-amber-300 whitespace-nowrap shrink-0">
                          +{m.rewardCoins.toLocaleString()} Xu
                        </span>
                      </div>

                      <div className="mt-3 flex items-center gap-3">
                        <div className="flex-1">
                          <div className="flex items-center justify-between text-[11px] font-mono-tabular text-slate-300 mb-1">
                            <span>
                              {progress} / {m.target}
                            </span>
                            <span>{pct}%</span>
                          </div>
                          <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                            <div
                              className={`h-full transition-all ${
                                claimed || claimable
                                  ? 'bg-emerald-400'
                                  : 'bg-amber-400'
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>

                        <button
                          type="button"
                          disabled={!claimable}
                          onClick={() => onClaimMission(m.id)}
                          className={`px-3.5 py-2 rounded-lg text-xs font-extrabold whitespace-nowrap shrink-0 transition-colors ${
                            claimed
                              ? 'bg-slate-800 text-emerald-400 cursor-default'
                              : claimable
                              ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 cursor-pointer'
                              : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                          }`}
                        >
                          {claimed
                            ? lang === 'vi'
                              ? 'Đã Nhận'
                              : 'Claimed'
                            : claimable
                            ? lang === 'vi'
                              ? 'Nhận Xu'
                              : 'Claim'
                            : lang === 'vi'
                            ? 'Đang Làm'
                            : 'In Progress'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          /* SQUAD & PLAYER CARDS TAB */
          <div className="py-5 space-y-5">
            {/* 5-Slot Active Starting Lineup */}
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                <h3 className="text-xs font-bold text-emerald-300">
                  {lang === 'vi'
                    ? 'Đội Hình Ra Sân 5v5 (Bấm vào vị trí muốn thay, rồi chọn cầu thủ bên dưới)'
                    : 'Active 5v5 Starting Lineup (Select a slot below, then click any owned player to swap)'}
                </h3>
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={onAutoBestLineup}
                    className="px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-extrabold transition-colors cursor-pointer"
                  >
                    {lang === 'vi' ? 'Tự Xếp Đội Mạnh Nhất' : 'Auto Best XI'}
                  </button>
                  <span className="font-mono-tabular text-xs font-bold text-white">
                    {lang === 'vi'
                      ? `Tổng OVR: ${squadOvr} / ${isAdmin || squadOvr > 150 ? 200 : 150}`
                      : `Team OVR: ${squadOvr} / ${isAdmin || squadOvr > 150 ? 200 : 150}`}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
                {club.lineupIds.map((cardId, idx) => {
                  const card = FC_PLAYERS[cardId];
                  if (!card) return null;
                  const isSlotSelected = selectedSlot === idx;
                  return (
                    <div key={`slot-${idx}`} className="space-y-1">
                      <div className="text-[11px] font-bold text-slate-300 flex items-center justify-between">
                        <span>{slotLabels[idx]}</span>
                        {isSlotSelected ? (
                          <span className="text-emerald-400">
                            {lang === 'vi' ? 'Đang chọn' : 'Selected'}
                          </span>
                        ) : null}
                      </div>
                      <FcCardBadge
                        card={card}
                        lang={lang}
                        compact
                        selected={isSlotSelected}
                        onClick={() => setSelectedSlot(idx)}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Club Inventory */}
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <h3 className="text-xs font-bold text-slate-300">
                  {lang === 'vi'
                    ? `Kho Cầu Thủ Sở Hữu (${ownedCards.length}) — Bấm để đưa vào vị trí "${slotLabels[selectedSlot]}"`
                    : `Owned Players (${ownedCards.length}) — Click to assign to "${slotLabels[selectedSlot]}"`}
                </h3>

                <div className="flex flex-wrap items-center gap-1">
                  {(['ALL', 'ST', 'WING', 'CM', 'CB', 'GK'] as const).map(
                    (pos) => (
                      <button
                        key={pos}
                        type="button"
                        onClick={() => setFilterPos(pos)}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors cursor-pointer ${
                          filterPos === pos
                            ? 'bg-emerald-500 text-slate-950'
                            : 'bg-slate-800 text-slate-300 hover:text-white'
                        }`}
                      >
                        {pos === 'ALL'
                          ? lang === 'vi'
                            ? 'Tất cả'
                            : 'All'
                          : pos === 'WING'
                          ? 'LW/RW'
                          : pos}
                      </button>
                    ),
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                {filteredCards.map((card) => {
                  const slotIdx = club.lineupIds.indexOf(card.id);
                  const inLineup = slotIdx >= 0;
                  return (
                    <FcCardBadge
                      key={card.id}
                      card={card}
                      lang={lang}
                      compact
                      selected={inLineup}
                      equippedLabel={
                        inLineup
                          ? `${lang === 'vi' ? 'Đang đá' : 'In XI'}: ${slotLabels[slotIdx]}`
                          : null
                      }
                      onClick={() => onAssignLineupSlot(selectedSlot, card.id)}
                    />
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-end pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={onClose}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm cursor-pointer"
              >
                <CheckCircle2 size={16} />
                <span>
                  {lang === 'vi' ? 'Xong · Lưu Đội Hình' : 'Done · Save Squad'}
                </span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
