import pandas as pd
import os

def clean_renewable_share_energy_data(file_path, output_file):
  """
  Clean and prepare renewable share energy dataset for visualization.
  
  Parameters:
  file_path (str): Path to the CSV file
  output_file (str): Path to save the cleaned CSV file
  """
  df = pd.read_csv(file_path)
  
  # Define target countries and years
  target_countries = ['China', 'Japan', 'North Korea', 'South Korea', 'Mongolia', 'Taiwan']
  year_range = range(2015, 2025)
  
  # Filter for target countries and years
  mask = df['Entity'].isin(target_countries) & df['Year'].isin(year_range)
  filtered_df = df[mask].copy()
  
  # Combine North and South Korea
  def combine_korea(row):
      if row['Entity'] in ['North Korea', 'South Korea']:
          return 'Korea'
      return row['Entity']
  
  filtered_df['Entity'] = filtered_df.apply(combine_korea, axis=1)
  
  # Calculate weighted average for Korea
  final_df = filtered_df.groupby(['Year', 'Entity'])['Renewables (% equivalent primary energy)'].mean().reset_index()
  
  # Sort and save
  final_df = final_df.sort_values(['Entity', 'Year'])
  final_df.to_csv(output_file, index=False)
  print(f"\nCleaned data saved to {output_file}")

def clean_modern_renewable_data(file_path, output_file):
  """
  Clean and prepare modern renewable consumption/production dataset for visualization.

  Parameters:
  file_path (str): Path to the CSV file
  output_file (str): Path to save the cleaned CSV file
  """
  df = pd.read_csv(file_path)
  
  # Define target countries and years
  target_countries = ['China', 'Japan', 'North Korea', 'South Korea', 'Mongolia', 'Taiwan']
  year_range = range(2015, 2025)
  
  # Filter for target countries and years
  mask = df['Entity'].isin(target_countries) & df['Year'].isin(year_range)
  filtered_df = df[mask].copy()
  
  # Combine North and South Korea
  def combine_korea(row):
      if row['Entity'] in ['North Korea', 'South Korea']:
          return 'Korea'
      return row['Entity']
  
  filtered_df['Entity'] = filtered_df.apply(combine_korea, axis=1)
  
  # Aggregate data for Korea
  filtered_df = filtered_df.groupby(['Year', 'Entity']).sum().reset_index()
  
  # Sort and save
  filtered_df = filtered_df.sort_values(['Entity', 'Year'])
  filtered_df.to_csv(output_file, index=False)
  print(f"\nCleaned data saved to {output_file}")

# Main execution
if __name__ == "__main__":
  # Example usage for renewable share energy data
  file_path_share_energy = "../data/raw/01-renewable-share-energy.csv"
  output_file_share_energy = "../data/cleaned/01_cleaned_renewable_share_energy.csv"
  #clean_renewable_share_energy_data(file_path_share_energy, output_file_share_energy)

  # Example usage for modern renewable consumption and production data
  consumption_file_path = "../data/raw/02-modern-renewable-energy-consumption.csv"
  production_file_path = "../data/raw/03-modern-renewable-prod.csv"
  
  consumption_output_file = "../data/cleaned/02_cleaned_modern_renewable_consumption.csv"
  production_output_file = "../data/cleaned/03_cleaned_modern_renewable_production.csv"
  
  clean_modern_renewable_data(consumption_file_path, consumption_output_file)
  clean_modern_renewable_data(production_file_path, production_output_file)
