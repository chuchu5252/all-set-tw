session,
depositOverview,
);
        let creditCards = await session.resource(
          CREDIT_CARD_BILLS_RESOURCE,
          {},
        );
        const noCreditCard = hasNoCtbcCreditCard(creditCards);
        if (!noCreditCard)
          creditCards = await fetchCtbcCardStatements(
            (resource, data) => session.resource(resource, data),
            creditCards,
          );
        // Like the official App, skip every card query when login haveCC is
        // "0". creditCards stays undefined for users without a credit card.
        const creditCardBills =
          session.haveCC === "0"
            ? undefined
            : await session.resource(CREDIT_CARD_BILLS_RESOURCE, {});
        const creditCards =
          creditCardBills && !hasNoCtbcCreditCard(creditCardBills)
            ? await fetchCtbcCardStatements(
                (resource, data) => session.resource(resource, data),
                creditCardBills,
              )
            : undefined;
// The summary call refreshes the same session data used by the official
// App (available credit and billed/unbilled totals). Its raw response is
// intentionally not persisted until those fields have a stable mapping.
        if (!noCreditCard)
        if (creditCards)
await session.resource(CREDIT_CARD_SUMMARY_RESOURCE, {});
        const unbilled = noCreditCard
          ? undefined
          : await fetchUnbilledTransactions(session);
        const realtime = noCreditCard
          ? undefined
          : await fetchPagedCardItems(
        const unbilled = creditCards
          ? await fetchUnbilledTransactions(session)
          : undefined;
        const realtime = creditCards
          ? await fetchPagedCardItems(
session,
REALTIME_RESOURCE,
REALTIME_PAGE_RESOURCE,
{},
            );
            )
          : undefined;
const payloads: CtbcPayloads = {
depositOverview,
depositTransactions,
          creditCards: noCreditCard ? undefined : creditCards,
          creditCards,
unbilled,
realtime,
};
@@ -347,6 +350,8 @@ class CtbcMobileSession {
private httpStatus: number | null = null;
private loginAttempt = 0;
private loginConfirmationType: "initial" | "duplicate" = "initial";
  // Login rsData.haveCC: "1" holds a credit card, "0" holds none, "" unknown.
  private loginHaveCC = "";

constructor(
private readonly fetcher: CtbcFetch,
@@ -362,6 +367,10 @@ class CtbcMobileSession {
return this.loggedIn;
}

  get haveCC() {
    return this.loginHaveCC;
  }

async bootstrap() {
const tokenUrl = new URL(`${CTBC_IMP_ORIGIN}/oauth/token`);
tokenUrl.searchParams.set("grant_type", "client_credentials");
@@ -510,6 +519,7 @@ class CtbcMobileSession {
);
}
this.loggedIn = true;
    this.loginHaveCC = stringValue(data.haveCC);
await this.options.onPendingSession?.(undefined);
}

@@ -770,6 +780,14 @@ class CtbcMobileSession {
isNoCreditCardMessage(response.message)
)
return;
    // The official App treats card SVC 9902 as no credit card. When login
    // reported haveCC "1", keep it a failure so card data is never dropped.
    if (
      resource === CREDIT_CARD_BILLS_RESOURCE &&
      isNoCreditCardCode(response) &&
      this.loginHaveCC !== "1"
    )
      return;
// 只有信用卡、沒有臺幣存款帳戶的使用者，存款總覽回 SVC 9993。
// 視為無存款並繼續同步信用卡；只記錄固定事件，不記錄銀行訊息。
if (
@@ -855,7 +873,8 @@ class CtbcMobileSession {

function hasNoCtbcCreditCard(response: JsonRecord) {
if (isVerificationResponse(response)) return false;
  if (isNoCreditCardMessage(response.message)) return true;
  if (isNoCreditCardMessage(response.message) || isNoCreditCardCode(response))
    return true;
const data = responseData(response);
return (
Array.isArray(data.cardDataList) &&
@@ -865,6 +884,13 @@ function hasNoCtbcCreditCard(response: JsonRecord) {
);
}

function isNoCreditCardCode(response: JsonRecord) {
  return (
    stringValue(response.sys || response.systemId) === "SVC" &&
    stringValue(response.code) === "9902"
  );
}

async function fetchDepositTransactions(
session: CtbcMobileSession,
depositOverview: JsonRecord,
