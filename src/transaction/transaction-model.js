var mongoose = require('mongoose');

var transactionSchema = new mongoose.Schema({
  Source_Extract_Code: String,
  Source_Name: String,
  Source_System_Transaction_Identifier: Number,
  Source_Account_Number: Number,
  Source_Portfolio_Number: Number,
  Source_Account_Name: String,
  Security_Identifier_ISIN: String,
  Security_Identifier_CUSIP: String,
  Security_Identifier_SEDOL: String,
  Security_Short_Name: String,
  Counterparty_Local_Code: Number,
  Counterparty_Name: String,
  Internal_CUID: String,
  Investment_Manager_Code: Number,
  Investment_Manager_Name: String,
  External_Source_Trade_Reference_Number: String,
  Client_Transaction_Reference_ID: String,
  Broker_Confirm_Number: String,
  Security_Type_Code: String,
  Security_Type_Description: String,
  Transaction_Type: String,
  Location_Code: String,
  Trade_Source_Code: String,
  Trade_Date_and_Time: String, // Timestamp
  Received_Date_and_Time: String, // Timestamp
  Contractual_Settlement_Date_and_Time: String, // Timestamp
  Actual_Settlement_Date_and_Time: String, // Timestamp
  Maturity_Date_and_Time: String, // Timestamp
  Settlement_Currency: String,
  Quantity: Number,
  Deal_Price: Number,
  Net_Settlement_Amount: Number,
  Gross_Transaction_Amount: Number,
  Reverse_Amount: String,
  Accrued_Interest_Amount: Number,
  Interest_Rate: String,
  Miscellaneous_Fees: Number,
  Brokerage_Commission: Number,
  Book_Value: Number,
  Par_Value: Number,
  Transaction_Status: String,
  Transaction_Status_Date_and_Time: String, // Timestamp
  Affirmation_Status: String,
  Affirmation_Status_Date_and_Time: String, // Timestamp
  STE_Indicator: String,
  STP_Indicator: String,
  STE_Code: String,
  "Non-STE_Reason": String,
  STP_Code: String,
  "Non-STP_Reason": String,
  Fail_Reason_Code: String,
  Fail_Reason_Description: String,
  Match_Fail_Reason: String,
  Narrative_Description: String,
  Transaction_Status_TLM: String,
  Account_Base_Currency: String,
  Broker_Amount: Number,
  Broker_Settlement_Amount: Number,
  Exchange_Rate: Number,
  Bank_Identifier_Code: String,
  Bank_Identifier_Name: String,
  Place_of_Settlement: String,
  TAR_Trade_Action: String,
  TAR_From_Currency: String,
  Security_Identifier_Bank_Internal: String,
  Trade_Source_Code_Description: String
}, {
  // Important! Has to match the collection name in db
  collection: 'transaction'
});

var Transaction = mongoose.model('Transaction', transactionSchema);

module.exports = Transaction;