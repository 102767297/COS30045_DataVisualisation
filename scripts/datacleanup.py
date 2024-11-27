import pandas as pd

# Load the data from the CSV file
data = pd.read_csv('./data/cleaned/New_OECD_RenewableEnergy.csv')

# Display the total count of missing values for each column
print("Missing values before cleaning:")
print(data.isnull().sum())

# Option 1: Drop rows with any missing values
# data_cleaned = data.dropna()

# Option 2: Fill missing values
# For numerical columns only
numeric_columns = data.select_dtypes(include=['float64', 'int64']).columns
data[numeric_columns] = data[numeric_columns].fillna(data[numeric_columns].mean())

# For categorical columns (object columns)
for column in data.select_dtypes(include=['object']).columns:
    data[column].fillna(data[column].mode()[0], inplace=True)

# Option 3: Fill missing values with a specific value (e.g., 0)
# data.fillna(0, inplace=True)

# Verify changes
print("Missing values after cleaning:")
print(data.isnull().sum())

# Save the cleaned data to a new CSV file
data.to_csv('New_OECD_RenewableEnergy.csv', index=False)
